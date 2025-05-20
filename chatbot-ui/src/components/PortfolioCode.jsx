import React, { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiDownload } from "react-icons/fi";
import JSZip from "jszip";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FileSidebar = ({
  files,
  selectedFile,
  setSelectedFile,
  handleDownloadAll,
}) => (
  <div className="w-1/5 bg-gray-100 p-2 border-r overflow-auto">
    <h2 className="text-lg font-bold mb-2">Files</h2>
    <ul>
      {files.map((filename) => (
        <li
          key={filename}
          className={`cursor-pointer p-2 rounded ${
            selectedFile === filename
              ? "bg-blue-200 font-semibold"
              : "hover:bg-gray-200"
          }`}
          onClick={() => setSelectedFile(filename)}
        >
          {filename}
        </li>
      ))}
    </ul>
    <button
      onClick={handleDownloadAll}
      className="mt-4 w-full bg-blue-500 text-gray-600 px-2 py-1 rounded hover:bg-blue-600 flex items-center justify-center gap-2"
    >
      <FiDownload /> Download
    </button>
  </div>
);

const CodeHeader = ({ filename, onDownload }) => (
  <div className="flex justify-between items-center px-4 py-2 bg-gray-100 border-b border-gray-300">
    <h3 className="font-bold text-sm">{filename}</h3>
    <button
      onClick={onDownload}
      className="text-sm bg-transparent hover:bg-gray-200 px-2 py-1 rounded mt-4"
    >
      <FiDownload className="text-xl text-gray-600" />
    </button>
  </div>
);

function PortfolioCode() {
  const [codeFiles, setCodeFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState("index.html");

  useEffect(() => {
    fetch(`${BASE_URL}/get-webSite-code`)
      .then((res) => res.json())
      .then((data) => {
        setCodeFiles(data);
        setSelectedFile(Object.keys(data)[0]);
      })
      .catch((err) => console.error("Error fetching webSite code:", err));
  }, []);

  const handleDownloadFile = (filename) => {
    const element = document.createElement("a");
    const file = new Blob([codeFiles[filename]], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
  };

  const handleDownloadAll = () => {
    const zip = new JSZip();
    Object.entries(codeFiles).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    zip.generateAsync({ type: "blob" }).then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "webSite-code.zip";
      link.click();
    });
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Code Panel</h2>
      <div className="flex  rounded overflow-x-auto h-[530px] bg-white overflow-hidden shadow-lg">
        <FileSidebar
          files={Object.keys(codeFiles)}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          handleDownloadAll={handleDownloadAll}
        />

        <div className="w-4/5 relative flex flex-col ">
          <CodeHeader
            filename={selectedFile}
            onDownload={() => handleDownloadFile(selectedFile)}
          />
          <div className="p-1 overflow-auto h-full border-b border-gray-300">
            <SyntaxHighlighter
              language={
                selectedFile.endsWith(".js")
                  ? "javascript"
                  : selectedFile.endsWith(".css")
                  ? "css"
                  : "html"
              }
              style={dracula}
              showLineNumbers
            >
              {codeFiles[selectedFile]}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </>
  );
}

export default PortfolioCode;
