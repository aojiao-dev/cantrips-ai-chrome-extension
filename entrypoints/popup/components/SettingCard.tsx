interface SettingCardProps {
    title: string;
    subtitle: string;
    onClick?: () => void;
  }

export const SettingCard = (props: SettingCardProps) => (
  <div
    onClick={props.onClick}
    className="box-border"
  >
    <div className="text-section">
    <p className="title">{props.title}</p>
    <p className="subtitle">{props.subtitle}</p>
    </div>
  </div>
);