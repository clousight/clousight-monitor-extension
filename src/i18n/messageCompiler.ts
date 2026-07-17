/**
 * CSP-safe message compiler for vue-i18n.
 *
 * MV3 extensions run under `script-src 'self'`, which forbids `eval` /
 * `new Function`. vue-i18n's built-in message compiler generates code and runs
 * it via `new Function`, so it crashes in the extension. This compiler
 * interprets the message string directly instead.
 *
 * It supports the only syntax Clousight's locale files use — named (`{name}`)
 * and positional (`{0}`) interpolation. It intentionally does NOT support
 * plurals (`a | b`), linked messages (`@:key`), or modifiers; add support here
 * (with a matching locale-lint check) before introducing that syntax.
 */

import type { MessageCompiler, MessageContext, MessageFunction } from 'vue-i18n';

type Token = { text: string } | { named: string } | { list: number };
type RuntimeMessageContext = MessageContext<unknown> & {
  interpolate(value: unknown): unknown;
  normalize(values: unknown[]): unknown;
};

const PLACEHOLDER = /\{(\w+)\}/g;
const cache = new Map<string, MessageFunction>();

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  PLACEHOLDER.lastIndex = 0;
  while ((match = PLACEHOLDER.exec(source)) !== null) {
    if (match.index > last) {
      tokens.push({ text: source.slice(last, match.index) });
    }
    const name = match[1];
    tokens.push(/^\d+$/.test(name) ? { list: Number(name) } : { named: name });
    last = PLACEHOLDER.lastIndex;
  }
  if (last < source.length) {
    tokens.push({ text: source.slice(last) });
  }
  return tokens;
}

function toMessageFunction(source: string): MessageFunction {
  const tokens = tokenize(source);
  return ((ctx: RuntimeMessageContext) =>
    ctx.normalize(
      tokens.map(token => {
        if ('text' in token) {
          return token.text;
        }
        const value = 'named' in token ? ctx.named(token.named) : ctx.list(token.list);
        return ctx.interpolate(value);
      })
    )) as MessageFunction;
}

export const cspMessageCompiler: MessageCompiler = (message, { key }) => {
  if (typeof message !== 'string') {
    // We never ship precompiled AST resources, so this path shouldn't run;
    // fall back to the key rather than attempting to interpret an AST node.
    return () => key;
  }
  let fn = cache.get(message);
  if (!fn) {
    fn = toMessageFunction(message);
    cache.set(message, fn);
  }
  return fn;
};
