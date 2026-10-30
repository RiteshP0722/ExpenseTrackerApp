import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import TextField from "../components/TextField";
import { colors } from "../constants/colors";
import { fill, strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { friendlyError, isNetworkError, otpSendError } from "../lib/errors";
import { firstError, otpSchema, phoneSchema } from "../lib/validation";

const OTP_COOLDOWN_SECONDS = 60;

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Seconds left before "Send OTP" can be tapped again (Supabase allows one SMS per number per minute).
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const parsedPhone = phoneSchema.safeParse(phone);

  async function handleSendOtp() {
    setError("");
    if (!parsedPhone.success) {
      setError(firstError(parsedPhone) ?? strings.phoneInvalid);
      return;
    }
    if (loading || cooldown > 0) return;
    setLoading(true);
    try {
      await sendOtp(`+91${parsedPhone.data}`);
      setStep("otp");
    } catch (err) {
      setError(otpSendError(err));
    } finally {
      // Every try counts toward Supabase's SMS limit, success or not.
      setCooldown(OTP_COOLDOWN_SECONDS);
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    const parsedOtp = otpSchema.safeParse(otp);
    if (!parsedOtp.success || !parsedPhone.success) {
      setError(strings.otpInvalid);
      return;
    }
    setLoading(true);
    try {
      // On success the auth listener updates the session and AuthGate opens Home.
      await verifyOtp(`+91${parsedPhone.data}`, parsedOtp.data);
    } catch (err) {
      setError(isNetworkError(err) ? friendlyError(err) : strings.otpWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{strings.companyName}</Text>
          <Text style={styles.subtitle}>{strings.dailyExpenses}</Text>

          {step === "phone" ? (
            <>
              <TextField
                label={strings.mobileNumber}
                value={phone}
                onChangeText={setPhone}
                placeholder={strings.mobilePlaceholder}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={14}
                error={error || null}
              />
              <Button
                title={cooldown > 0 ? fill(strings.sendOtpWait, { seconds: cooldown }) : strings.sendOtp}
                onPress={handleSendOtp}
                disabled={cooldown > 0}
                loading={loading}
                style={styles.button}
              />
            </>
          ) : (
            <>
              <TextField
                label={fill(strings.enterOtpFor, { phone: parsedPhone.success ? parsedPhone.data : phone })}
                value={otp}
                onChangeText={setOtp}
                placeholder={strings.otpPlaceholder}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                error={error || null}
              />
              <Button
                title={strings.verifyLogin}
                onPress={handleVerifyOtp}
                loading={loading}
                style={styles.button}
              />
              <Button
                title={strings.changeNumber}
                variant="outline"
                disabled={loading}
                onPress={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                style={styles.secondButton}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: colors.dark },
  subtitle: { fontSize: 17, color: colors.gray, marginBottom: 16 },
  button: { marginTop: 20 },
  secondButton: { marginTop: 12 },
});
