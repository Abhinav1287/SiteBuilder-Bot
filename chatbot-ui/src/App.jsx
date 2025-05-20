import React, { useState, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import UserProfilePanel from "./components/UserProfilePanel";
import PortfolioPreview from "./components/PortfolioPreview";
import PortfolioCode from "./components/PortfolioCode";
import "./App.css";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const togglePanel = (panel) => {
    setShowHistory(panel === "history" ? !showHistory : false);
    setShowProfile(panel === "profile" ? !showProfile : false);
    setShowPreview(panel === "preview" ? !showPreview : false);
    setShowCode(panel === "code" ? !showCode : false);
  };
  

  return (
    <div className="flex h-screen">
      <div className={`flex-grow  ${showHistory || showProfile || showPreview || showCode ? 'w-1/3 mt-2': ' mx-60  p-4'}`}>
        <ChatWindow />
      </div>

      {showHistory && (
        <div className=" p-4 w-2/3 bg-white border-l overflow-y-auto">
          <ChatHistoryPanel />
        </div>
      )}

      {showProfile && (
        <div className=" p-4 w-2/3 bg-white border-l overflow-y-auto">
          <UserProfilePanel />
        </div>
      )}

      {showPreview && (
        <div className=" p-4 w-2/3 bg-white border-l overflow-y-auto">
          <PortfolioPreview />
        </div>
      )}

      {showCode && (
        <div className=" p-4 w-2/3 bg-white border-l overflow-y-auto">
          <PortfolioCode />
        </div>
      )}

<div className="absolute top-4 right-4 z-50">
      {/* Toggle Icon Button */}
      <button
        ref={buttonRef}
        className="p-2 rounded-full bg-gray-100 shadow hover:bg-gray-200 transition"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <MoreHorizontal className="w-6 h-6 text-gray-700" />
      </button>

      {/* Popover-style Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-0 right-12 bg-white rounded-l-full shadow-lg flex flex-row animate-fade-in"
        >
          <button
            className="bg-indigo-200 px-4 py-2 rounded-l-full border-r text-center w-[165px]"
            onClick={() => {
              togglePanel("history");
              setMenuOpen(false);
            }}
          >
            {showHistory ? "Back to Chat" : "View JSON History"}
          </button>
          <button
            className="bg-green-200 px-4 py-2 border-r text-center w-[165px]"
            onClick={() => {
              togglePanel("profile");
              setMenuOpen(false);
            }}
          >
            {showProfile ? "Back to Chat" : "View Profile"}
          </button>
          <button
            className="bg-purple-200 px-4 py-2 border-r text-center w-[165px]"
            onClick={() => {
              togglePanel("preview");
              setMenuOpen(false);
            }}
          >
            {showPreview ? "Back to Chat" : "Preview"}
          </button>
          <button
            className="bg-blue-200 px-4 py-2 text-center w-[165px]"
            onClick={() => {
              togglePanel("code");
              setMenuOpen(false);
            }}
          >
            {showCode ? "Back to Chat" : "Code"}
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

export default App;
