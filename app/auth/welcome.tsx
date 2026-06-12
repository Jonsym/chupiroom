import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { LogoMark } from '@/components/LogoMark';
import { WelcomeWave } from '@/components/WelcomeWave';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';

type Country = { code: string; dial: string; label: string };

/** Supported dial codes (México + USA required, plus common LATAM/ES). */
const COUNTRIES: Country[] = [
  { code: 'MX', dial: '+52', label: 'México' },
  { code: 'US', dial: '+1', label: 'Estados Unidos' },
  { code: 'ES', dial: '+34', label: 'España' },
  { code: 'AR', dial: '+54', label: 'Argentina' },
  { code: 'CO', dial: '+57', label: 'Colombia' },
  { code: 'CL', dial: '+56', label: 'Chile' },
  { code: 'PE', dial: '+51', label: 'Perú' },
];

type Fields = {
  firstName: string;
  lastName: string;
  dialCode: string;
  phone: string;
  email: string;
  password: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digitCount = (s: string) => (s.match(/\d/g) ?? []).length;

/** Client-side validation with Spanish messages. Returns null when valid. */
function validate(mode: Mode, f: Fields): string | null {
  if (mode === 'signup') {
    if (!f.firstName.trim()) return 'Introduce tu nombre.';
    if (!f.lastName.trim()) return 'Introduce tu primer apellido.';
    if (!f.dialCode) return 'Selecciona el código de país.';
    if (!f.phone.trim()) return 'Introduce tu número de teléfono.';
    const digits = digitCount(f.phone);
    if (digits < 7 || digits > 15) return 'Introduce un número de teléfono válido.';
  }
  if (!f.email.trim()) return 'Introduce tu correo.';
  if (!EMAIL_RE.test(f.email.trim())) return 'Introduce un correo válido.';
  if (!f.password) return 'Introduce tu contraseña.';
  if (f.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}

/** Map Supabase / network auth errors to friendly Spanish copy. */
function spanishAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Ya existe una cuenta con este correo.';
  if (msg.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  if (msg.includes('should be at least') || (msg.includes('password') && msg.includes('6')))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('weak password')) return 'Elige una contraseña más segura.';
  if (msg.includes('anonymous')) return 'El acceso de invitado no está disponible ahora mismo.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Demasiados intentos. Inténtalo más tarde.';
  if (msg.includes('not configured') || msg.includes('configurado'))
    return 'El inicio de sesión no está disponible ahora mismo.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to'))
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No se pudo completar. Inténtalo de nuevo.';
}

export default function AuthWelcomeScreen() {
  const { signInWithEmail, signUpWithEmail, signInAsGuest, configured } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearMessages = () => {
    if (error) setError(null);
    if (info) setInfo(null);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    setInfo(null);
    if (!configured) {
      setError('El inicio de sesión no está disponible ahora mismo.');
      return;
    }
    const validationError = validate(mode, {
      firstName,
      lastName,
      dialCode: country.dial,
      phone,
      email,
      password,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        // onAuthStateChange + the protected router handle navigation.
      } else {
        // Stored as a single string: country code + number.
        const fullPhone = `${country.dial} ${phone.trim()}`;
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: fullPhone,
        });
        if (needsConfirmation) {
          // Confirm Email is enabled on the project — no session yet.
          setMode('signin');
          setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
        }
        // Otherwise a session is returned and the router redirects automatically.
      }
    } catch (e) {
      setError(spanishAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = async () => {
    setInfo(null);
    if (!configured) {
      setError('El inicio de sesión no está disponible ahora mismo.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signInAsGuest();
      // onAuthStateChange + the protected router send the guest to /home.
    } catch (e) {
      setError(spanishAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const isSignin = mode === 'signin';

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Wave line + brand, like the reference */}
            <View style={styles.waveArea}>
              <WelcomeWave />
            </View>
            <LogoMark />
            <Text style={styles.title}>{isSignin ? 'Iniciar sesión' : 'Crear cuenta'}</Text>

            {/* Mode toggle */}
            <View style={styles.tabs}>
              <Pressable
                onPress={() => switchMode('signin')}
                style={[styles.tab, isSignin && styles.tabOn]}
              >
                <Text style={isSignin ? styles.tabTextOn : styles.tabText}>Iniciar sesión</Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('signup')}
                style={[styles.tab, !isSignin && styles.tabOn]}
              >
                <Text style={!isSignin ? styles.tabTextOn : styles.tabText}>Crear cuenta</Text>
              </Pressable>
            </View>

            {/* Register-only fields */}
            {!isSignin && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      clearMessages();
                    }}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                    autoCapitalize="words"
                    autoComplete="name-given"
                    editable={!busy}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Primer apellido</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={(t) => {
                      setLastName(t);
                      clearMessages();
                    }}
                    placeholder="Tu primer apellido"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                    autoCapitalize="words"
                    autoComplete="name-family"
                    editable={!busy}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Número de teléfono</Text>
                  <View style={styles.phoneRow}>
                    <Pressable
                      onPress={() => {
                        setPickerOpen(true);
                        clearMessages();
                      }}
                      disabled={busy}
                      accessibilityLabel="Código de país"
                      style={styles.codeBtn}
                    >
                      <Text style={styles.codeText}>{country.dial}</Text>
                      <ChevronDown size={16} color={colors.mutedText} />
                    </Pressable>
                    <TextInput
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t);
                        clearMessages();
                      }}
                      placeholder="600 123 456"
                      placeholderTextColor={colors.mutedText}
                      style={[styles.input, styles.phoneInput]}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      inputMode="tel"
                      editable={!busy}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Email + password */}
            <View style={styles.field}>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearMessages();
                }}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                inputMode="email"
                editable={!busy}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearMessages();
                }}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignin ? 'current-password' : 'new-password'}
                editable={!busy}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {info && <Text style={styles.info}>{info}</Text>}

            <AppButton
              label={isSignin ? 'Iniciar sesión' : 'Crear cuenta'}
              onPress={submit}
              loading={busy}
              disabled={busy}
              style={styles.submit}
            />

            <View style={styles.guestRow}>
              <View style={styles.line} />
              <Text style={styles.guestOr}>o</Text>
              <View style={styles.line} />
            </View>

            <AppButton
              label="Entrar como invitado"
              variant="secondary"
              onPress={continueAsGuest}
              disabled={busy}
            />
            <Text style={styles.guestHint}>
              Juega y únete a salas al instante. Crea una cuenta más tarde para guardar tu perfil.
            </Text>

            <Text style={styles.footer}>Bebe con responsabilidad · +18</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country code picker */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Código de país</Text>
            {COUNTRIES.map((c) => {
              const selected = c.code === country.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    setCountry(c);
                    setPickerOpen(false);
                  }}
                  style={[styles.countryRow, selected && styles.countryRowOn]}
                >
                  <Text style={styles.countryLabel}>{c.label}</Text>
                  <Text style={[styles.countryDial, selected && styles.countryDialOn]}>{c.dial}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  waveArea: {
    height: 130,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  tabOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.accentSoft,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  tabTextOn: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSize.md,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  info: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  submit: {
    marginTop: spacing.xs,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  guestOr: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  guestHint: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Country picker sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  countryRowOn: {
    backgroundColor: colors.surfaceElevated,
  },
  countryLabel: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  countryDial: {
    color: colors.mutedText,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  countryDialOn: {
    color: colors.accent,
  },
});
