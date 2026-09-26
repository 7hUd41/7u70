/* Site-wide settings. Everything here is safe to publish.

   One codebase serves several sites (the Runfold demo, a personal knowledge
   base…). What differs per site comes from the environment at build time:
     NEXT_PUBLIC_RUNFOLD_REPO   the repository that holds the content, where
                                "Stuck here?" and "Report a problem" open issues
                                (default: the Runfold repository)
     AT_AUTHOR=1                author mode on a self-hosted instance */

const repo = (process.env.NEXT_PUBLIC_RUNFOLD_REPO || "https://github.com/7hUd41/runfold").replace(/\/+$/, "");

export const site = {
  /** Public repository of the content, used for "report a problem" links. */
  repo,
  issues: `${repo}/issues/new`,
  /** Author mode enables server-side writes: validations, the editor.
      On in development; set AT_AUTHOR=1 to enable on a self-hosted instance. */
  authorMode: process.env.AT_AUTHOR === "1" || process.env.NODE_ENV === "development",
};
