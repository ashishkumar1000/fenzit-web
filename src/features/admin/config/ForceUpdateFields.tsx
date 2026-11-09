import { TextInput } from "../../../components/ui/TextInput";
import { MessageField } from "./MessageField";
import { STORE_HOSTS, type ConfigDraft, type FieldKey } from "./configRules";
import styles from "./ForceUpdateFields.module.css";

type Platform = keyof typeof STORE_HOSTS;

/** The dotted names the BE uses for each platform field. */
const PLATFORM_KEYS: Record<
  Platform,
  { minVersion: FieldKey; storeUrl: FieldKey; message: FieldKey }
> = {
  android: {
    minVersion: "android.minVersion",
    storeUrl: "android.storeUrl",
    message: "android.message",
  },
  ios: { minVersion: "ios.minVersion", storeUrl: "ios.storeUrl", message: "ios.message" },
};

const PLATFORM_TITLE: Record<Platform, string> = { android: "Android", ios: "iOS" };

export interface ConfigFieldProps {
  values: ConfigDraft;
  errorFor: (key: FieldKey) => string | undefined;
  onChange: (key: FieldKey, value: string) => void;
}

/** Android and iOS side by side on wide screens, one above the other on phones. */
export function ForceUpdateFields(props: ConfigFieldProps) {
  return (
    <div className={styles.platforms}>
      <PlatformBlock platform="android" {...props} />
      <PlatformBlock platform="ios" {...props} />
    </div>
  );
}

function PlatformBlock({
  platform,
  values,
  errorFor,
  onChange,
}: ConfigFieldProps & { platform: Platform }) {
  const keys = PLATFORM_KEYS[platform];
  const idPrefix = `config-${platform}`;
  return (
    <section className={styles.block} aria-labelledby={`${idPrefix}-title`}>
      <h4 id={`${idPrefix}-title`} className={styles.title}>
        {PLATFORM_TITLE[platform]}
      </h4>
      <TextInput
        id={`${idPrefix}-min-version`}
        name={keys.minVersion}
        label="Minimum version"
        value={values[keys.minVersion]}
        onChange={(value) => onChange(keys.minVersion, value)}
        hint="Three numbers with dots, like 1.4.0. Installs older than this are stopped."
        error={errorFor(keys.minVersion)}
      />
      <TextInput
        id={`${idPrefix}-store-url`}
        name={keys.storeUrl}
        label="Store link"
        type="url"
        value={values[keys.storeUrl]}
        onChange={(value) => onChange(keys.storeUrl, value)}
        hint={`Must be a secure link on ${STORE_HOSTS[platform]}.`}
        error={errorFor(keys.storeUrl)}
      />
      <MessageField
        id={`${idPrefix}-message`}
        name={keys.message}
        label="Message"
        value={values[keys.message]}
        onChange={(value) => onChange(keys.message, value)}
        error={errorFor(keys.message)}
      />
    </section>
  );
}
