/* Site-wide settings. Everything here is safe to publish. */

export const site = {
  /** Public repository, used for "report a problem" links. */
  repo: "https://github.com/tugdual/runfold",
  issues: "https://github.com/tugdual/runfold/issues/new",
  /** Author mode enables server-side writes: validations, the editor.
      On in development; set AT_AUTHOR=1 to enable on a self-hosted instance. */
  authorMode: process.env.AT_AUTHOR === "1" || process.env.NODE_ENV === "development",
};
