// C15 마을 채팅: Village 를 감싸서 같은 나라 접속자·말풍선·움직임을 붙이고, 아래에 한마디 입력줄
// 사용법: <Village …/> 를 <ChatVillage …/> 로 바꾸면 됨 (넘기는 값은 Village 와 똑같음)
import Village from "../../engine/village/Village";
import useChat from "./useChat";
import ChatBox from "./ChatBox";

function ChatVillage(props) {
  const chat = useChat(props.countryCode, { age: props.age, gender: props.gender, place: props.place, costume: props.costume });

  return (
    <>
      <Village {...props} myMessage={chat.myMessage} others={chat.others} onMove={chat.move} />
      <ChatBox chat={chat} />
    </>
  );
}

export default ChatVillage;
