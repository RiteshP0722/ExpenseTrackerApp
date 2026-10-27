import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/Button";
import { colors } from "../constants/colors";

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp() {
    setError("");
    if (phone.trim().length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      await sendOtp("+91" + phone.trim());
      setStep("otp");
    } catch (err) {
      setError(err.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    if (otp.trim().length < 4) {
      setError("Enter the OTP you received");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp("+91" + phone.trim(), otp.trim());
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err.message || "Invalid OTP, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Acme Traders</Text>
        <Text style={styles.subtitle}>Daily Expenses</Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              keyboardType="number-pad"
              maxLength={10}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button title="Send OTP" onPress={handleSendOtp} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to {phone}</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button title="Verify & Login" onPress={handleVerifyOtp} loading={loading} />
            <Button
              title="Change number"
              variant="outline"
              onPress={() => setStep("phone")}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 6 },
  title: { fontSize: 24, fontWeight: "700", color: colors.dark },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: "600", color: colors.dark, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  error: { color: "#C0392B", marginBottom: 12, fontSize: 13 },
});
