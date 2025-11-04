import { FiMessageCircle, FiPhone, FiCopy } from "react-icons/fi";
import "./Meeting.css";
import { VideoTile } from "./VideoTile";
import { MediaControls } from "./MediaControls";
import { useNavigate, useParams } from "react-router-dom";
import { meetingRepository } from "../../modules/meetings/meeting.repository";
import { useEffect, useState } from "react";
import { PreviewMedia } from "./PreviewMedia";
import { useMeeting } from "../../modules/meetings/meeting.hook";
import { useFlashMessage } from "../../modules/ui/ui.state";
import { Chat } from "./Chat";

function Meeting() {
  const { id } = useParams(); // Get meeting ID from URL params
  const [showPreview, setShowPreview] = useState(true);
  const {
    me,
    getStream,
    toggleVideo,
    toggleVoice,
    join,
    participants,
    clear,
    chats,
    sendChatMessage,
  } = useMeeting(id!); // useMeetingカスタムフックからmeとgetStreamを取得
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { addMessage } = useFlashMessage();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    initialize();
    // クリーンアップ関数で会議から退出する処理を実行
    return () => {
      clear();
    };
  }, []); // Empty dependency array to run only once on mount

  const initialize = async () => {
    try {
      console.log("Joining meeting with ID:", id);
      await meetingRepository.joinMeeting(id!); // 存在しないURLを投げた場合はエラーを返す
      await getStream(); // ユーザーのメディアストリームを取得
      setIsLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  const joinMeeting = async () => {
    join();
    setShowPreview(false);
  };

  const leaveMeeting = async () => {
    clear();
    navigate("/");
  };

  const copyMeetingId = async () => {
    try {
      await navigator.clipboard.writeText(id!);
      addMessage({
        message: "ミーティングIDをコピーしました",
        type: "success",
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (showPreview) {
    return (
      <PreviewMedia
        isLoading={isLoading}
        participant={me}
        onToggleVideo={toggleVideo}
        onToggleVoice={toggleVoice}
        onJoin={joinMeeting}
        onCancel={leaveMeeting}
      />
    );
  }

  return (
    <div className="meeting-container">
      <div className={`video-area ${isChatOpen ? "with-chat" : ""}`}>
        <div className="video-grid">
          <VideoTile
            participant={{
              ...me,
              name: me.name + "(あなた)",
            }}
          />
          {Array.from(participants.values()).map((participant) => (
            <VideoTile key={participant.id} participant={participant} />
          ))}
        </div>
      </div>

      {isChatOpen && (
        <Chat
          onClose={() => setIsChatOpen(false)}
          chatMessages={chats}
          onSubmit={sendChatMessage}
        />
      )}

      <div className="control-bar">
        <MediaControls
          cameraOn={me.cameraOn}
          voiceOn={me.voiceOn}
          onToggleVideo={toggleVideo}
          onToggleVoice={toggleVoice}
        />

        <button
          className="control-button"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <FiMessageCircle />
        </button>

        <button className="control-button" onClick={copyMeetingId}>
          <FiCopy />
        </button>

        <button className="control-button leave-button" onClick={leaveMeeting}>
          <FiPhone />
        </button>
      </div>
    </div>
  );
}

export default Meeting;
