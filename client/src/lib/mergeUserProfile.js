/** @typedef {{
 *   firstName?: string;
 *   lastName?: string;
 *   university?: string;
 *   email?: string;
 }} SnapshotProfile */

/** @typedef {{
 *   firstName?: string;
 *   lastName?: string;
 *   institutionName?: string;
 *   avatarUrl?: string | null;
 *   avatarTs?: number | null;
 }} SettingsProfile */

/**
 * Merges saved account profile over Phase 3 mock snapshot profile for greetings and nav.
 * @param {SnapshotProfile | null | undefined} snapProf
 * @param {{ id: string; email: string } | null} authUser
 * @param {SettingsProfile | null | undefined} settingsProf
 */
export function mergeUserProfile(snapProf, authUser, settingsProf) {
  const s =
    snapProf && typeof snapProf === "object"
      ? { ...snapProf }
      : { firstName: "", lastName: "", university: "", email: "" };

  const inst = settingsProf?.institutionName?.trim?.() ?? "";
  const fn = settingsProf?.firstName?.trim?.() ?? "";
  const ln = settingsProf?.lastName?.trim?.() ?? "";

  const bust =
    settingsProf?.avatarUrl && settingsProf.avatarTs != null
      ? `?t=${settingsProf.avatarTs}`
      : "";

  return {
    ...s,
    firstName: fn || s.firstName || "Friend",
    lastName: ln || s.lastName || "",
    university: inst || s.university || "",
    email:
      typeof authUser?.email === "string"
        ? authUser.email
        : s.email ?? "",
    mergedAvatarSrc: settingsProf?.avatarUrl
      ? `${settingsProf.avatarUrl}${bust}`
      : null,
  };
}
