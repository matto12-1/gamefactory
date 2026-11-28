// 공용 장부를 바로 써 게임 끝 화면이 서버 답을 기다리지 않게 한다.
// /run의 판 표는 한 번만 쓸 수 있다. 한 판의 최고 갱신 한 건만 /score로 보낸다.
export function createRecordLink({ game, ledger, nametag, storage, key = 'mattoland.fishing.pending-record', wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  let run = null, sent = false;
  const read = () => { try { return JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return null; } };
  const put = value => { try { if (value) storage?.setItem(key, JSON.stringify(value)); else storage?.removeItem(key); } catch { /* 저장이 막혀도 한 판은 계속한다. */ } };
  const valid = x => x && (x.token == null || typeof x.token === 'string') && Number.isSafeInteger(x.record?.cm) && x.record.cm > 0 && typeof x.record.name === 'string';
  const startRun = async () => { try { return await (await ledger()).startRun(game, 'solo', 'quick', undefined, { timeoutMs: 3000 }); } catch { return { ok: false, error: 'offline' }; } };
  async function send(pending) {
    try {
      const name = await nametag();
      if (!name) return { ok: false, error: 'need_name' };
      if (!pending.token) {
        const reply = await startRun();
        if (!reply?.ok || !reply.token) return reply;
        const current = read();
        pending = { ...pending, token: reply.token };
        if (current?.record?.cm === pending.record.cm && !current.token) put(pending);
        // game.json의 최소 1초. 지난 기록 재시도 때문에 놀이 시작을 기다리지는 않는다.
        await wait(1000);
      }
      const reply = await (await ledger()).submitScore({ token: pending.token, score: pending.record.cm, fish: { id: pending.record.id, name: pending.record.name, cm: pending.record.cm }, name, play: 'quick' });
      // 다른 판에서 갱신한 대기 기록을 늦게 온 답으로 지우지 않는다.
      if (read()?.token === pending.token) {
        if (reply?.ok || reply?.error === 'used_token') put(null);
        else if (['expired_token', 'bad_token'].includes(reply?.error)) put({ ...pending, token: null });
      }
      return reply;
    } catch { return { ok: false, error: 'offline' }; }
  }
  return {
    start() {
      sent = false;
      const pending = read();
      run = startRun();
      return valid(pending) ? send(pending) : Promise.resolve(null);
    },
    async finish(record) {
      if (sent || !run) return;
      sent = true;
      const reply = await run;
      const pending = { token: reply?.ok ? reply.token : null, record };
      put(pending);
      return pending.token ? send(pending) : { ok: false, error: 'offline' };
    },
  };
}
