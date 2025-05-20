import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ImageUpload from "./ImageUpload";
import { SendHorizontal, ImageIcon, X } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/reset`).then(() => {
      setMessages([]);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const updatedMessages = [...messages, { sender: "user", text: userInput }];
    setMessages(updatedMessages);

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await res.json();
      setMessages([...updatedMessages, { sender: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }

    setUserInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleImageMessage = ({ images, text }) => {
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        images,
        text,
      },
    ]);
    setShowUploader(false);
  };

  const clearText = () => {
    setUserInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="p-4 min-h-screen relative">
      <div className="chat-box bg-slate-100 p-1 rounded shadow h-[470px] text-md overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sender === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block m-2 max-w-[80%] ${
                msg.sender === "user"
                  ? "bg-green-200 rounded-l-xl"
                  : "bg-indigo-200 rounded-r-xl"
              } p-2`}
            >
              {msg.images &&
                msg.images.map((img, i) => (
                  <div key={i} className="mb-2">
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${img.url}`}
                      alt={`uploaded-${i}`}
                      className="max-w-xs rounded mb-1"
                    />
                    {img.description && (
                      <p >
                        {img.description}
                      </p>
                    )}
                  </div>
                ))}
              {msg.text && <p>{msg.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="absolute bottom-3 left-0 w-full px-4 bg-white">
        <div className="flex gap-2 items-end rounded-2xl border pl-3 pr-2 pb-1 pt-1">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={handleInputChange}
            rows={1}
            className="flex-grow p-2 rounded-l-xl resize-none outline-none overflow-hidden max-h-40"
            placeholder="Type your message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            onClick={() => setShowUploader(!showUploader)}
            className="bg-blue-200 hover:bg-blue-300 p-2 rounded"
            title={showUploader ? "Close Uploader" : "Upload Image"}
          >
            {showUploader ? (
              <X className="w-5 h-5" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={sendMessage}
            className="bg-blue-200 hover:bg-blue-300 p-2 rounded-r-xl"
            title="Send Message"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showUploader && (
        <div className="absolute bottom-20 right-10 bg-white border shadow-md rounded p-2 z-50">
          <ImageUpload onUploadComplete={handleImageMessage} />
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
