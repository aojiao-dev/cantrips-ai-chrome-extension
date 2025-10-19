import "./Overview.css";
import AppHeader from "./Header.tsx";
import { SettingCard } from "./SettingCard.tsx";
import { EN_TEXT } from "../common/en.ts";

const feedbackEndpoint = "https://docs.google.com/forms/d/e/1FAIpQLSe7BXSn1bDKVGyW6EDSZMQt8qIwoLOzc3wLk5tyFgzM4p2FAQ/viewform?usp=dialog"
const loginEndpointV2 =
  "https://cantrips-ai.auth.us-west-2.amazoncognito.com/login?client_id=7896k6a5fc1i72a4nqsa8c2nm2&response_type=token&scope=email+openid+phone&redirect_uri=https%3A%2F%2Fcantrips-ai.auth.us-west-2.amazoncognito.com";
const logoutEndpointV2 =
  "https://cantrips-ai.auth.us-west-2.amazoncognito.com/logout?client_id=7896k6a5fc1i72a4nqsa8c2nm2&logout_uri=https%3A%2F%2Fcantrips.ai/logout";

interface OverviewProps {
  setPage: (string: any) => void;
}

interface FooterButtonProps {
  text: string;
  onClick?: () => void;
}

interface InstructionPanelProps {
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

const PrimaryFooterButton = (props: FooterButtonProps) => (
  <button className="primary-button" onClick={props.onClick}>
    {props.text}
  </button>
);

const SecondaryFooterButton = (props: FooterButtonProps) => (
  <button className="secondary-button" onClick={props.onClick}>
    {props.text}
  </button>
);

const OverviewFooter = ({
  authenticated,
  setAuthenticated,
}: InstructionPanelProps) => {
  const handleSignIn = async () => {
    await chrome.tabs.create({ url: loginEndpointV2, active: true });
  };

  const handleSignOut = async () => {
    await storage.removeItem("local:access_token");
    setAuthenticated(false);
    await chrome.tabs.create({
      url: logoutEndpointV2,
      active: true,
    });
  };

  const handleFeedback = async () => {
    await chrome.tabs.create({ url: feedbackEndpoint, active: true });
  };

  return (
    <div className="overview-footer">
      <SecondaryFooterButton
        text={EN_TEXT.FEEDBACK_BUTTON}
        onClick={handleFeedback}
      />
      {authenticated ? (
        <SecondaryFooterButton
          text={EN_TEXT.SIGN_OUT_BUTTON}
          onClick={handleSignOut}
        />
      ) : (
        <PrimaryFooterButton
          text={EN_TEXT.SIGN_IN_BUTTON}
          onClick={handleSignIn}
        />
      )}
    </div>
  );
};

const InstructionPanel = ({ authenticated }: InstructionPanelProps) => {
  return (
    <div className="instruction-panel">
      {authenticated ? (
        <span className="logged-in-instruction">
          {EN_TEXT.LOGGED_IN_INSTRUCTION}
        </span>
      ) : (
        <span className="sign-in-instruction">
          {EN_TEXT.SIGN_IN_INSTRUCTION}
        </span>
      )}
    </div>
  );
};

function Overview({ setPage }: OverviewProps) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.getItem("local:access_token");
        setAuthenticated(token ? true : false);
      } catch (error) {
        console.error("Error checking local:access_token status:", error);
        setAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <>
      <AppHeader />
      <div className="header-break"></div>
      <SettingCard
        title={EN_TEXT.SETTING_CARD_FORMAT_HEADER}
        subtitle={EN_TEXT.SETTING_CARD_FORMAT_BODY}
        onClick={() => setPage("PreferenceSetting")}
      />
      <div className="setting-card-break"></div>
      <InstructionPanel
        authenticated={authenticated}
        setAuthenticated={setAuthenticated}
      />
      <hr className="line-break" />
      <OverviewFooter
        authenticated={authenticated}
        setAuthenticated={setAuthenticated}
      />
    </>
  );
}

export default Overview;
