import Mux from "@mux/mux-node";

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

export function getMuxConfig(env = process.env) {
  return {
    tokenId: firstDefined(env.MUX_TOKEN_ID, env.pst_interview_MUX_TOKEN_ID),
    tokenSecret: firstDefined(env.MUX_TOKEN_SECRET, env.pst_interview_MUX_TOKEN_SECRET),
    signingKeyId: firstDefined(env.MUX_SIGNING_KEY_ID, env.pst_interview_MUX_SIGNING_KEY_ID),
    signingKeyPrivate: firstDefined(env.MUX_SIGNING_KEY_PRIVATE, env.pst_interview_MUX_SIGNING_KEY_PRIVATE),
    playbackId: firstDefined(env.MUX_PLAYBACK_ID, env.pst_interview_MUX_PLAYBACK_ID),
  };
}

export function createMuxClient(env = process.env) {
  const { tokenId, tokenSecret } = getMuxConfig(env);
  return new Mux({
    tokenId,
    tokenSecret,
  });
}
