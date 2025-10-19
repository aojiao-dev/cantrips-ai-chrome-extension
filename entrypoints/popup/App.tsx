import { useState } from "react";
import "./App.css";
import PreferenceSetting from "./components/PreferenceSetting.tsx";
import Overview from "./components/Overview.tsx";

function App() {
  const [page, setPage] = useState<"Overview" | "PreferenceSetting">(
    "Overview"
  );

  return (
    <div className="outer">
      {(() => {
        if (page === "PreferenceSetting") {
          return <PreferenceSetting setPage={setPage} />;
        }
        return <Overview setPage={setPage} />;
      })()}
    </div>
  );
}

export default App;
