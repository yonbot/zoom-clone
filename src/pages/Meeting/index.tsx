import { FiMessageCircle, FiPhone, FiCopy } from "react-icons/fi";
import "./Meeting.css";
import { VideoTile } from "./VideoTile";
import { MediaControls } from "./MediaControls";
import { useNavigate, useParams } from "react-router-dom";
import { meetingRepository } from "../../modules/meetings/meeting.repository";
import { useEffect, useState } from "react";
import { PreviewMedia } from "./PreviewMedia";
import { useMeeting } from "../../modules/meetings/meeting.hook";

function Meeting() {
  const { id } = useParams(); // Get meeting ID from URL params
  const [showPreview, setShowPreview] = useState(true);
  const { me, getStream, toggleVideo, toggleVoice } = useMeeting(); // useMeetingカスタムフックからmeとgetStreamを取得
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, []); // Empty dependency array to run only once on mount

  const initialize = async () => {
    try {
      console.log('Joining meeting with ID:', id);
      await meetingRepository.joinMeeting(id!); // 存在しないURLを投げた場合はエラーを返す
      await getStream(); // ユーザーのメディアストリームを取得
      setIsLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  const joinMeeting = async () => {
    setShowPreview(false);
  }

  const leaveMeeting = async () => {
    navigate('/');
  }

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
      <div className="video-area">
        <div className="video-grid">
          <VideoTile participant={me} />
          <VideoTile participant={me} />
        </div>
      </div>

      <div className="control-bar">
        <MediaControls
          cameraOn={me.cameraOn}
          voiceOn={me.voiceOn}
          onToggleVideo={toggleVideo}
          onToggleVoice={toggleVoice}
        />

        <button className="control-button">
          <FiMessageCircle />
        </button>

        <button className="control-button">
          <FiCopy />
        </button>

        <button className="control-button leave-button">
          <FiPhone />
        </button>
      </div>
    </div>
  );
}

export default Meeting;
