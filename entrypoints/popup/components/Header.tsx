import { SetStateAction, useState } from "react";
import "./Header.css";
import icon from "../../../assets/icon.svg";

function Header() {
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    const checkActive = async () => {
      try {
        const active = await storage.getItem("local:app_active");
        setIsActive(active === "true");
      } catch (error) {
        console.error("Error checking local:app_active status:", error);
        setIsActive(false);
      }
    };
    checkActive();
  }, []);

  const handleToggle = async (
    isActive: boolean,
    setIsActive: {
      (value: SetStateAction<boolean>): void;
      (arg0: boolean): void;
    }
  ) => {
    if (isActive) {
      setIsActive(false);
      await storage.setItem("local:app_active", JSON.stringify(false));
    } else {
      setIsActive(true);
      await storage.setItem("local:app_active", JSON.stringify(true));
    }
  };

  return (
    <div className="header-outer">
      <div className="logo-box">
        <div className="logo">
          {<img src={icon} alt="Logo" className="overview-icons" />}
        </div>
      </div>

      <div className="slider-box">
        <label className="switch">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => handleToggle(isActive, setIsActive)}
          />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
}

export default Header;
