import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { currentUserAtom } from "../auth/current-user.state";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";
import { useNavigate } from "react-router-dom";
import { useFlashMessage } from "../ui/ui.state";

export interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  cameraOn: boolean;
  voiceOn: boolean;
  isHost?: boolean;
}

export const useMeeting = (meetingId: string) => {
  const [localStreams, setLocalStreams] = useState<MediaStream[]>([]);
  const currentUser = useAtomValue(currentUserAtom);
  const [me, setMe] = useState<Participant>({
    id: currentUser!.id, // typescriptの非nullアサーション演算子, nullの時はエラーを投げる
    name: currentUser!.name,
    stream: localStreams[0],
    cameraOn: true,
    voiceOn: true,
  });
  const socketRef = useRef<Socket>(null); // Socket.IOクライアントの参照を保持するためのref, 再描画で消えないようにするため
  const peerRef = useRef<Peer>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(
    new Map()
  );
  const navigate = useNavigate();
  const { addMessage } = useFlashMessage();

  useEffect(() => {
    setMe((prev) => ({ ...prev, stream: localStreams[0] })); // streamのみ更新
  }, [localStreams]); // localStreamsが変化したときにmeを更新する

  const getStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }); // カメラとマイクのアクセス許可を求める
    setLocalStreams((prev) => [...prev, stream]); // 既存のものの末尾に追加する
  };

  const toggleVideo = () => {
    let cameraOn = false;
    const localStream = me.stream;
    if (localStream != null) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      cameraOn = videoTracks[0]?.enabled; // optional chaining
      // 左側の値が存在していれば右側のプロパティにアクセスする.もしnullまたはundefinedなら、エラーを起こさずにundefinedを返す
    }
    setMe((prev) => ({ ...prev, cameraOn })); // cameraOnのみ更新

    socketRef.current?.emit("update-participant", meetingId, {
      id: me.id,
      name: me.name,
      voiceOn: me.voiceOn,
      cameraOn,
    });
  };

  const toggleVoice = () => {
    let voiceOn = false;
    const localStream = me.stream;
    if (localStream != null) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      voiceOn = audioTracks[0]?.enabled;
    }
    setMe((prev) => ({ ...prev, voiceOn: voiceOn })); // voiceOnのみ更新

    socketRef.current?.emit("update-participant", meetingId, {
      id: me.id,
      name: me.name,
      voiceOn,
      cameraOn: me.cameraOn,
    });
  };

  // 会議に参加する処理
  const join = async () => {
    const localStream = me.stream;
    if (localStream == null || currentUser == null) return;

    // Socket.IOクライアントの初期化, ここでwebsocket接続が確立される
    socketRef.current = io(import.meta.env.VITE_API_URL);
    const socket = socketRef.current;

    // 接続が確立したときにhandleSocketConnectedを呼び出す
    socket.on("connect", () => handleSocketConnected(localStream));

    // 他の参加者が参加したときにhandleJoinedを呼び出す
    socket.on("participant-joined", (data) => handleJoined(data, localStream));

    // 他の参加者が更新されたときの処理
    socket.on("participant-updated", (data) => {
      setParticipants((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.participant.id, {
          ...data.participant,
          stream: prev.get(data.participant.id)?.stream,
        });
        return newMap;
      });
    });

    socket.on("participant-left", (data) => {
      setParticipants((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.leftParticipantId);
        return newMap;
      });
    });

    socket.on("close", () => {
      clear();
      addMessage({ message: "ミーティングが終了しました", type: "success" });
      navigate("/");
    });
  };

  const handleSocketConnected = (localStream: MediaStream) => {
    const socket = socketRef.current;
    if (socket == null) return;

    // PeerJSクライアントの初期化, PeerJSサーバーに接続
    // me.idをPeerIDとして使用, 参加者ごとに一意のIDが必要
    peerRef.current = new Peer(me.id, {
      host: "0.peerjs.com",
      port: 443,
      secure: true,
    });
    const peer = peerRef.current;
    // PeerJSサーバーへの接続が確立したときの処理
    peer.on("open", () => {
      // サーバーにjoin-meetingイベントを送信
      // 参加者情報をサーバーに送信
      socket.emit("join-meeting", meetingId, {
        id: me.id,
        name: me.name,
        voiceOn: me.voiceOn,
        cameraOn: me.cameraOn,
      });
    });
    // 他の参加者からの着信を処理
    peer.on("call", (mediaConn) => {
      mediaConn.answer(localStream); // 自分のメディアストリームを相手に送信
    });
  };

  // 会議に参加したときの処理
  const handleJoined = (data: any, localStream: MediaStream) => {
    if (peerRef.current == null) return;
    data.participants.forEach((participant: Participant) => {
      if (participant.id !== me.id) {
        // 他の参加者に自分のメディアストリームを送信
        const call = peerRef.current!.call(participant.id, localStream);
        // 他の参加者からのメディアストリームを受信
        call.on("stream", (remoteStream) => {
          setParticipants((prev) => {
            const newMap = new Map(prev); // Mapを新しく作成し、画面の再描画を促す
            newMap.set(participant.id, {
              ...participant,
              stream: remoteStream,
            });
            return newMap;
          });
        });
      } else {
        // host自身だった場合、meにisHostをセットする
        setMe((prev) => ({ ...prev, isHost: participant.isHost }));
      }
    });
  };

  const clear = () => {
    socketRef.current?.emit("leave-meeting", meetingId, me.id);
    localStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    setLocalStreams([]);
    peerRef.current?.destroy();
    socketRef.current?.disconnect();
  };

  return { me, getStream, toggleVideo, toggleVoice, join, participants, clear };
};
