import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarPicker, Input, ModalFrame, ModalOverlay } from './ui';
import { VALIDATION, ERROR_MESSAGES } from '../lib/constants';
import { THEMES, applyTheme, DEFAULT_THEME } from '../lib/themes';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { sparkleBurst, emojiRain } from '../lib/celebrations';
import {
  normalizeUsername,
  validateUsername,
  usernameSwapNotice,
  USERNAME_LIMITS,
} from '../lib/validation';
import { isUsernameAvailable } from '../lib/username';
import type { Profile } from '../types/profile';

/**
 * First-run profile setup, as three short steps.
 *
 * It used to be the edit-profile form with the setup fields switched on: a
 * welcome box, profile pic, display name, username, status and eight theme
 * cards on one scroll, the name field focused on open. With the keyboard up on
 * an iPhone 16 the header, the pinned save footer and the keyboard left room
 * for one field, and nothing said that only the display name was required
 * (2026-09-26). Now the one required answer has a screen to itself, with its
 * button directly under the field, and every step after it is marked optional.
 *
 * The username is not asked again — it was chosen at sign-up a minute earlier,
 * and editing it here would spend the free rename. The exception is when
 * sign-up could not give them the name they asked for: then step 1 says so and
 * offers the field.
 *
 * Nothing is saved until the last step. A profile without a display name is
 * what brings this back (App's needsProfileSetup), so closing the app midway
 * returns to step 1 rather than stranding a half-saved profile.
 */

const STEPS = 3;

interface ProfileSetupProps {
  profile: Profile;
  userId?: string;
  /** The username asked for at sign-up (auth user_metadata), for the swap notice. */
  requestedUsername?: unknown;
  onSave: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  onError?: (message: string) => void;
}

function StepTag({ required }: { required: boolean }) {
  // A state, so bold (the style-encodes-kind rule in /frontend). Required is
  // the one worth noticing, so it alone takes the accent.
  return (
    <span
      className="text-xs title-bold px-2 py-0.5 rounded-full border-2 border-dotted flex-shrink-0"
      style={
        required
          ? { color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
          : { color: 'var(--text-body)', borderColor: 'var(--border-primary)' }
      }
    >
      {required ? 'required' : 'optional'}
    </span>
  );
}

function StepHeading({
  children,
  required,
  focusOnMount,
}: {
  children: ReactNode;
  required: boolean;
  focusOnMount: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  // On mount, not on the step change: with AnimatePresence mode="wait" the new
  // step mounts only after the old one has animated out, so focusing when
  // `step` changed landed on the outgoing heading, which then disappeared and
  // dropped focus to the page. Moving focus here also closes the keyboard
  // between steps and tells VoiceOver where it is.
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <h2 ref={ref} tabIndex={-1} className="xanga-title text-xl outline-none">
        {children}
      </h2>
      <StepTag required={required} />
    </div>
  );
}

/** What the journal looks like in the theme being tried — a static entry card. */
function SampleEntry() {
  return (
    <div className="xanga-box p-0 overflow-hidden" aria-hidden="true">
      <div
        className="px-3 py-2 border-b-2 border-dotted"
        style={{
          background:
            'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
          borderColor: 'var(--border-primary)',
        }}
      >
        <p className="xanga-title text-base">my first entry ✨</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          📅 today
        </p>
      </div>
      <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-body)' }}>
        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          Current Mood: <span style={{ color: 'var(--text-body)' }}>😊 nostalgic</span>
        </p>
        <p>
          finally made a journal again. it feels like 2005 in here{' '}
          {/* Styled as the theme's link without being one: the card is a picture. */}
          <span className="xanga-link">&amp; i love it</span>
        </p>
      </div>
    </div>
  );
}

export default function ProfileSetup({
  profile,
  userId,
  requestedUsername,
  onSave,
  onError,
}: ProfileSetupProps) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState(profile.username || '');
  const [selectedTheme, setSelectedTheme] = useState<string>(profile.theme || DEFAULT_THEME);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [statusError, setStatusError] = useState<string | undefined>();

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameHintId = useId();
  const statusHintId = useId();

  // Setup cannot be dismissed: there is no profile to go back to.
  useFocusTrap(dialogRef, true, () => {});

  // Only when sign-up could not give them the name they asked for.
  const swapNotice = usernameSwapNotice(
    requestedUsername,
    profile.username,
    profile.username_changed_at
  );
  const usernameChanged = normalizeUsername(username) !== (profile.username ?? '');

  const goToNameStep = () => setStep(0);

  const handleNameNext = async (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setNameError('~ pick a name 2 continue ~');
      return;
    }
    if (name.length > VALIDATION.displayName.maxLength) {
      setNameError(ERROR_MESSAGES.profile.displayNameTooLong);
      return;
    }
    if (swapNotice && usernameChanged) {
      const handle = normalizeUsername(username);
      const problem = validateUsername(handle);
      if (problem) {
        setUsernameError(problem);
        return;
      }
      // null (the check failed) falls through: the unique index still guards.
      if ((await isUsernameAvailable(handle)) === false) {
        setUsernameError(`~ @${handle} is taken, try another ~`);
        return;
      }
    }
    setStep(1);
  };

  const pickTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    // Live: the setup screen, the sample entry and the journal behind repaint.
    applyTheme(themeId);
  };

  const finish = async (includeExtras: boolean) => {
    if (includeExtras && statusMessage.length > VALIDATION.statusMessage.maxLength) {
      setStatusError(ERROR_MESSAGES.profile.statusMessageTooLong);
      return;
    }

    const updates: Partial<Profile> = {
      display_name: displayName.trim(),
      theme: selectedTheme,
    };
    if (includeExtras) {
      if (avatarUrl.trim()) updates.avatar_url = avatarUrl.trim();
      if (statusMessage.trim()) updates.status_message = statusMessage.trim();
    }
    // Sent only when changed — and only offered when sign-up swapped the name.
    if (swapNotice && usernameChanged) {
      updates.username = normalizeUsername(username);
    }

    setSaving(true);
    const { error } = await onSave(updates);
    setSaving(false);

    if (error) {
      // A username clash can only be fixed on step 1, where the field is.
      if (updates.username && /taken/i.test(error)) {
        setUsernameError(error);
        goToNameStep();
      }
      onError?.(error.startsWith('~') ? error : `~ ${error} ~`);
      return;
    }
    sparkleBurst();
    emojiRain(['✨', '💕', '⭐', '🌈'], 10);
    // App opens the composer once the saved profile has a display name.
  };

  const progress = (
    <div
      className="flex-shrink-0 px-4 py-2 border-b-2 border-dotted"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs title-bold" style={{ color: 'var(--text-title)' }}>
          ✨ set up ur space ✨
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
        >
          step {step + 1} of {STEPS}
        </span>
      </div>
      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS}
        aria-label={`Step ${step + 1} of ${STEPS}`}
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= step ? 'var(--accent-primary)' : 'var(--border-primary)',
              opacity: i <= step ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );

  const backButton = (
    <button
      type="button"
      onClick={() => setStep((s) => Math.max(0, s - 1))}
      disabled={saving}
      className="xanga-link text-xs min-h-[44px] inline-flex items-center"
    >
      ‹ back
    </button>
  );

  return (
    <AnimatePresence>
      {/* No onClick: tapping outside must not dismiss setup. */}
      <ModalOverlay>
        <ModalFrame
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Set up your profile"
          // Pinned to the top, not centred (.setup-panel). On the website
          // --keyboard-inset is always 0 — only the native app can measure the
          // keyboard — so a centred panel sat half behind it, and the button
          // under the field was the half that went.
          className="max-w-md flex flex-col setup-panel"
        >
          {progress}

          <div
            className="overflow-y-auto keyboard-safe-scroll flex-1 min-h-0 p-4"
            style={{ backgroundColor: 'var(--modal-bg)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0 && (
                  <form onSubmit={(e) => void handleNameNext(e)} noValidate>
                    <StepHeading required focusOnMount={false}>
                      what should we call u?
                    </StepHeading>
                    <p
                      id={nameHintId}
                      className="text-xs mb-3"
                      style={{ color: 'var(--text-body)' }}
                    >
                      the name at the top of ur space.
                      {!swapNotice && profile.username && (
                        <>
                          {' '}
                          ur @handle is already set:{' '}
                          <span className="title-bold">@{profile.username}</span>
                        </>
                      )}
                    </p>
                    <Input
                      type="text"
                      value={displayName}
                      aria-label="Display name"
                      aria-describedby={nameHintId}
                      aria-required="true"
                      autoFocus
                      enterKeyHint={swapNotice ? 'next' : 'go'}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (nameError) setNameError(undefined);
                      }}
                      placeholder="what should we call u?"
                      error={nameError}
                      maxLength={VALIDATION.displayName.maxLength}
                    />

                    {swapNotice && (
                      <div className="mt-4">
                        <p
                          className="text-xs mb-2 p-2 rounded-lg"
                          role="status"
                          style={{
                            color: 'var(--text-body)',
                            backgroundColor:
                              'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))',
                          }}
                        >
                          {swapNotice}
                        </p>
                        <Input
                          type="text"
                          label="ur @handle (optional)"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value.toLowerCase());
                            if (usernameError) setUsernameError(undefined);
                          }}
                          error={usernameError}
                          autoComplete="nickname"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="go"
                          maxLength={USERNAME_LIMITS.max}
                        />
                      </div>
                    )}

                    <button type="submit" className="xanga-button w-full mt-4 text-sm">
                      ~ next ~
                    </button>
                  </form>
                )}

                {step === 1 && (
                  <div>
                    <StepHeading required={false} focusOnMount>
                      pick ur vibe
                    </StepHeading>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-body)' }}>
                      tap one 2 try it on ~ this is how ur journal will look. change it anytime.
                    </p>
                    <SampleEntry />
                    <div className="grid grid-cols-2 gap-2 mt-3" role="group" aria-label="Themes">
                      {THEMES.map((theme) => {
                        const selected = selectedTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => pickTheme(theme.id)}
                            aria-pressed={selected}
                            className="p-2 rounded-lg text-left transition-all border-2 border-dotted min-h-[44px] flex items-center gap-2"
                            style={{
                              backgroundColor: selected
                                ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-bg))'
                                : 'var(--card-bg)',
                              borderColor: selected
                                ? 'var(--accent-primary)'
                                : 'var(--border-primary)',
                            }}
                          >
                            <span className="flex -space-x-1 flex-shrink-0" aria-hidden="true">
                              {theme.previewColors.map((color, i) => (
                                <span
                                  key={i}
                                  className="w-3.5 h-3.5 rounded-full"
                                  style={{
                                    backgroundColor: color,
                                    border: '1px solid var(--border-primary)',
                                  }}
                                />
                              ))}
                            </span>
                            <span
                              className="text-xs title-bold min-w-0 break-words"
                              style={{ color: 'var(--text-body)' }}
                            >
                              {theme.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-4 gap-3">
                      {backButton}
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="xanga-button text-sm flex-1"
                      >
                        ~ next ~
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void finish(true);
                    }}
                    noValidate
                  >
                    <fieldset disabled={saving}>
                      <StepHeading required={false} focusOnMount>
                        finishing touches
                      </StepHeading>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-body)' }}>
                        add them now or anytime from ur profile.
                      </p>

                      {showAvatarPicker ? (
                        <AvatarPicker
                          userId={userId}
                          onSelect={(url) => {
                            setAvatarUrl(url);
                            setShowAvatarPicker(false);
                          }}
                          onCancel={() => setShowAvatarPicker(false)}
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={avatarUrl}
                              alt="Your profile pic"
                              size="lg"
                              fallbackSeed={userId || 'guest'}
                              editable
                              onClick={() => setShowAvatarPicker(true)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAvatarPicker(true)}
                              className="xanga-button-ghost title-bold px-4 py-2 text-xs min-h-[44px]"
                            >
                              {avatarUrl ? '~ change pic ~' : '~ choose a profile pic ~'}
                            </button>
                          </div>

                          <div className="mt-4">
                            <Input
                              type="text"
                              label="status message"
                              value={statusMessage}
                              aria-describedby={statusHintId}
                              onChange={(e) => {
                                setStatusMessage(e.target.value);
                                if (statusError) setStatusError(undefined);
                              }}
                              placeholder="what's on ur mind..."
                              error={statusError}
                              enterKeyHint="done"
                              maxLength={VALIDATION.statusMessage.maxLength}
                            />
                            <p
                              id={statusHintId}
                              className="text-xs mt-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              shows at the top of ur journal ~ {statusMessage.length}/
                              {VALIDATION.statusMessage.maxLength}
                            </p>
                          </div>

                          <button type="submit" className="xanga-button w-full mt-4 text-sm">
                            {saving ? 'saving...' : '~ save + start writing ~'}
                          </button>
                          <div className="flex items-center justify-between mt-1">
                            {backButton}
                            {/* Tertiary: the other way to finish, not a separate
                                destination (see /frontend, control tiers). */}
                            <button
                              type="button"
                              onClick={() => void finish(false)}
                              className="title-bold text-sm min-h-[44px] inline-flex items-center px-2"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              skip 4 now
                            </button>
                          </div>
                        </>
                      )}
                    </fieldset>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </ModalFrame>
      </ModalOverlay>
    </AnimatePresence>
  );
}
