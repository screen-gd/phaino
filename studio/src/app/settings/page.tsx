import { SettingsView } from "@/components/SettingsView";
import pkg from "../../../package.json";

export default function SettingsPage() {
  return <SettingsView version={pkg.version} />;
}
