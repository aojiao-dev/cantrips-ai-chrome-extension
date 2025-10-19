import "./PreferenceSetting.css";
import AppHeader from "./Header.tsx";
import { EN_TEXT } from "../common/en.ts";
import { SetStateAction, useEffect, useState } from "react";

interface PreferenceSettingProps {
  setPage: (string: any) => void;
}

const PreferenceSettingsCard = () => {
  const [dateFormat, setDateFormat] = useState("YYYYMMDD");
  const [filenameFormat, setFilenameFormat] = useState("{date} - {filename}");

  useEffect(() => {
    const loadStorageValues = async () => {
      const storedDateFormat = await storage.getItem("local:app_date_format") || "YYYYMMDD";
      const storedFilenameFormat = await storage.getItem("local:app_filename_format") || "{date} - {filename}";
      
      if (storedDateFormat && typeof storedDateFormat === "string") {
        setDateFormat(storedDateFormat)
      }

      if (storedFilenameFormat && typeof storedFilenameFormat === "string") {
        setFilenameFormat(storedFilenameFormat)
      }
    };

    loadStorageValues();
  }, []);

  const handleSetDateFormat = async (value: string) => {
    await storage.setItem("local:app_date_format", value);
    setDateFormat(value);
  };

  const handleSetFilenameFormat = async (value: string) => {
    await storage.setItem("local:app_filename_format", value);
    setFilenameFormat(value);
  };

  return (
    <div className="setting-main">
      <div className="setting-title">Preference Setting</div>

      {/* Date Format */}
      <div>
        <h2 className="section-title">Date Format</h2>
        <div className="select-wrapper">
          <select
            value={dateFormat}
            onChange={(e) => handleSetDateFormat(e.target.value)}
            className="select-input"
          >
            <option value="YYYYMMDD">YYYYMMDD</option>
            <option value="MMDDYYYY">MMDDYYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
          </select>
          <div className="select-arrow">
            <svg
              className="arrow-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <p className="helper-text">{EN_TEXT.DATE_FORMAT_TEXT}</p>
      </div>

      <div className="divider"></div>

      {/* Filename Format */}
      <div>
        <h2 className="section-title">Filename Format</h2>
        <div className="select-wrapper">
          <select
            value={filenameFormat}
            onChange={(e) => handleSetFilenameFormat(e.target.value)}
            className="select-input"
          >
            <option value="{date} - {filename}">{'date - filename'}</option>
            <option value="{filename} - {date}">{'filename - date'}</option>
            <option value="{filename}">{'filename'}</option>
          </select>
          <div className="select-arrow">
            <svg
              className="arrow-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <p className="helper-text">{EN_TEXT.FILENAME_FORMAT_TEXT}</p>
      </div>

      <div className="bottom-divider"></div>
    </div>
  );
};

function PreferenceSetting({ setPage }: PreferenceSettingProps) {
  return (
    <div className="setting-wrapper">
      <AppHeader />
      <PreferenceSettingsCard />
      <div className="button-wrapper">
        <button className="nav-button" onClick={() => setPage("Overview")}>
          Going Back
        </button>
      </div>
    </div>
  );
}

export default PreferenceSetting;
