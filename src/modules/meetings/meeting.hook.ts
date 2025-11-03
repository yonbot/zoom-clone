import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { currentUserAtom } from "../auth/current-user.state";

export interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  cameraOn: boolean;
  voiceOn: boolean;
}

export const useMeeting = () => {
  const [localStreams, setLocalStreams] = useState<MediaStream[]>([]);
  const currentUser = useAtomValue(currentUserAtom);
  const [me, setMe] = useState<Participant>({
    id: currentUser!.id, // typescriptの非nullアサーション演算子, nullの時はエラーを投げる
    name: currentUser!.name,
    stream: localStreams[0],
    cameraOn: true,
    voiceOn: true,
  });

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
  };

  return { me, getStream, toggleVideo, toggleVoice };
};