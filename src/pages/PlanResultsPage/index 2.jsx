import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import SectionHeader from "../../components/ui/SectionHeader";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import { computeOptions, createPaymentIntent, createReservationIntent, fetchPlan, fetchReservationIntent, fetchSuggestions, lockPlan, sendMessage, verifyCaptcha, voteOption } from "../../lib/api/workflow";

export default function PlanResultsPage() {
  const { plan_id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [excludeIds, setExcludeIds] = useState([]);
  const [reservation, setReservation] = useState(null);

  async function load() {
    try {
      const data = await fetchPlan(plan_id);
      setState({ loading: false, error: "", data });
    } catch (e) {
      setState({ loading: false, error: e.message || "Failed", data: null });
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [plan_id]);

  const options = state.data?.options || [];
  const votes = state.data?.votes || [];
  const suggestions = state.data?.suggestions || [];
  const plan = state.data?.plan;

  const voteCountByOption = useMemo(() => {
    const map = new Map();
    votes.forEach((vote) => {
      const prev = map.get(vote.option_id) || { yes: 0, no: 0, maybe: 0 };
      prev[vote.vote] += 1;
      map.set(vote.option_id, prev);
    });
    return map;
  }, [votes]);

  async function regenerate() {
    const resp = await computeOptions(plan_id, { rank_strategy: "soonest", exclude_option_ids: excludeIds, limit: 10 });
    setExcludeIds((prev) => [...new Set([...prev, ...(resp.items || []).map((opt) => opt.option_id)])]);
    await load();
  }

  async function doVote(option_id, value) {
    await voteOption(plan_id, option_id, value);
    await load();
  }

  async function doSuggest(option_id) {
    await fetchSuggestions(plan_id, option_id, 3);
    await load();
  }

  async function doLock(option_id) {
    await lockPlan(plan_id, option_id);
    await load();
  }

  async function doReservation(option) {
    const idempotency = crypto.randomUUID();
    const intent = await createReservationIntent({ rec_id: null, entity_id: "restaurant:luna-red", slot_start: option.start_ts, slot_end: option.end_ts, party_size: 2 }, idempotency);
    await verifyCaptcha(intent.intent_id, "demo-captcha");
    await createPaymentIntent({ intent_id: intent.intent_id, amount_cents: 500, currency: "usd", provider: "stripe_apple_pay" });
    const status = await fetchReservationIntent(intent.intent_id);
    setReservation(status);
    await sendMessage({ channel: "email", template: "reservation_confirmed", data: { intent_id: intent.intent_id } });
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader title="Plan Results" subtitle={`Status: ${plan?.status || "-"}`} action={<Link to={`/plan/${plan_id}`} className="chip chip-idle text-xs">Back to Plan</Link>} />
      <PageShell>
        {state.error ? <Card>{state.error}</Card> : null}
        <Card>
          <button className="chip chip-active text-xs" onClick={regenerate}>Regenerate Times</button>
        </Card>

        {options.map((option) => {
          const tally = voteCountByOption.get(option.option_id) || { yes: 0, no: 0, maybe: 0 };
          const optSuggestions = suggestions.filter((item) => item.option_id === option.option_id);
          return (
            <Card key={option.option_id}>
              <h3 className="font-bold">{new Date(option.start_ts).toLocaleString()} - {new Date(option.end_ts).toLocaleString()}</h3>
              <p className="text-xs text-soft">{option.rank_strategy}{option.score !== null ? ` · score ${option.score}` : ""}</p>
              <p className="text-xs mt-1">Votes: yes {tally.yes} / no {tally.no} / maybe {tally.maybe}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="chip chip-idle text-xs" onClick={() => doVote(option.option_id, "yes")}>Yes</button>
                <button className="chip chip-idle text-xs" onClick={() => doVote(option.option_id, "maybe")}>Maybe</button>
                <button className="chip chip-idle text-xs" onClick={() => doVote(option.option_id, "no")}>No</button>
                <button className="chip chip-idle text-xs" onClick={() => doSuggest(option.option_id)}>Suggestions</button>
                <button className="chip chip-active text-xs" onClick={() => doLock(option.option_id)} disabled={plan?.status === "locked"}>Lock</button>
                <button className="chip chip-idle text-xs" onClick={() => doReservation(option)}>Reserve (Demo)</button>
              </div>
              {optSuggestions.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-soft">{optSuggestions.map((s) => <li key={s.sugg_id}><span className="font-semibold text-ink">{s.title}</span> · {s.reason}</li>)}</ul>
              ) : null}
            </Card>
          );
        })}

        {reservation ? <Card>Reservation status: {reservation.status} {reservation.provider_ref ? `(${reservation.provider_ref})` : ""}</Card> : null}
      </PageShell>
    </MobileShell>
  );
}
