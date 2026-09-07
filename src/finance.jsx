import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Coins, RefreshCw, Send, ShieldCheck, WalletCards } from "lucide-react";

const initialFunds = [
  { id: "eur", code: "EUR-FUND", name: "EUR Operating Fund", currency: "EUR", balance: 10000 },
  { id: "etb", code: "ETB-FUND", name: "ETB Operating Fund", currency: "ETB", balance: 850000 },
];

const initialTransactions = [
  { id: "INC-2026-0001", date: "2026-09-08", type: "INCOME", direction: "CREDIT", fund: "ETB-FUND", currency: "ETB", amount: 250000, status: "COMPLETED", description: "Project funding receipt" },
  { id: "EXP-2026-0001", date: "2026-09-08", type: "EXPENSE", direction: "DEBIT", fund: "EUR-FUND", currency: "EUR", amount: 1250, status: "COMPLETED", description: "Cloud infrastructure" },
  { id: "CNV-2026-0001", date: "2026-09-07", type: "CURRENCY_CONVERSION", direction: "DEBIT", fund: "EUR-FUND", currency: "EUR", amount: 1000, status: "COMPLETED", description: "EUR to ETB conversion", linked: "190,000 ETB @ 190" },
];

const formatMoney = (amount, currency) => `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nextId = (prefix, count) => `${prefix}-2026-${String(count + 1).padStart(4, "0")}`;

export default function FinancialControl() {
  const [funds, setFunds] = useState(initialFunds);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [view, setView] = useState("overview");
  const [notice, setNotice] = useState("");
  const [entry, setEntry] = useState({ type: "EXPENSE", fundId: "eur", amount: "", category: "Digital services", description: "" });
  const [conversion, setConversion] = useState({ sourceFundId: "eur", destinationFundId: "etb", amount: "1000", rate: "190", fee: "0" });

  const totals = useMemo(() => ({
    income: transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0),
    expenses: transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0),
    fees: transactions.filter((item) => item.type === "CURRENCY_CONVERSION").reduce((sum, item) => sum + (item.fee || 0), 0),
  }), [transactions]);
  const budget = 1000000;
  const spent = 650000;
  const utilization = spent / budget;
  const selectedSource = funds.find((fund) => fund.id === conversion.sourceFundId);
  const selectedDestination = funds.find((fund) => fund.id === conversion.destinationFundId);
  const convertedAmount = (Number(conversion.amount) || 0) * (Number(conversion.rate) || 0);
  const totalDebit = (Number(conversion.amount) || 0) + (Number(conversion.fee) || 0);

  const updateEntry = (key, value) => setEntry((current) => ({ ...current, [key]: value }));
  const updateConversion = (key, value) => setConversion((current) => ({ ...current, [key]: value }));

  const postEntry = (event) => {
    event.preventDefault();
    const amount = Number(entry.amount);
    const fund = funds.find((item) => item.id === entry.fundId);
    if (!fund || !Number.isFinite(amount) || amount <= 0) return setNotice("Enter a valid amount and fund.");
    if (entry.type === "EXPENSE" && amount > fund.balance) return setNotice(`Insufficient funds. Available: ${formatMoney(fund.balance, fund.currency)}`);
    const balanceBefore = fund.balance;
    const balanceAfter = entry.type === "INCOME" ? balanceBefore + amount : balanceBefore - amount;
    setFunds((current) => current.map((item) => item.id === fund.id ? { ...item, balance: balanceAfter } : item));
    setTransactions((current) => [{ id: nextId(entry.type === "INCOME" ? "INC" : "EXP", current.length), date: new Date().toISOString().slice(0, 10), type: entry.type, direction: entry.type === "INCOME" ? "CREDIT" : "DEBIT", fund: fund.code, currency: fund.currency, amount, status: "COMPLETED", description: entry.description || entry.category, balanceBefore, balanceAfter }, ...current]);
    setEntry((current) => ({ ...current, amount: "", description: "" }));
    setNotice("Transaction recorded locally. Production posting must go through the atomic finance API.");
  };

  const postConversion = (event) => {
    event.preventDefault();
    const amount = Number(conversion.amount);
    const fee = Number(conversion.fee) || 0;
    if (!selectedSource || !selectedDestination || selectedSource.id === selectedDestination.id || amount <= 0 || convertedAmount <= 0) return setNotice("Choose two different funds and enter a valid conversion.");
    if (totalDebit > selectedSource.balance) return setNotice(`Insufficient funds. Available: ${formatMoney(selectedSource.balance, selectedSource.currency)}`);
    setFunds((current) => current.map((fund) => fund.id === selectedSource.id ? { ...fund, balance: fund.balance - totalDebit } : fund.id === selectedDestination.id ? { ...fund, balance: fund.balance + convertedAmount } : fund));
    setTransactions((current) => [{ id: nextId("CNV", current.length), date: new Date().toISOString().slice(0, 10), type: "CURRENCY_CONVERSION", direction: "DEBIT", fund: selectedSource.code, currency: selectedSource.currency, amount: totalDebit, fee, status: "COMPLETED", description: "Currency conversion", linked: `${formatMoney(convertedAmount, selectedDestination.currency)} @ ${conversion.rate}` }, ...current]);
    setNotice("Conversion recorded locally with the original exchange rate preserved.");
  };

  return <div className="financePage">
    <div className="financeHeader"><div><span className="eyebrow">Financial control</span><h2>Budget &amp; Cost Management</h2><p>Trace every debit, credit, transfer, conversion, and budget decision.</p></div><div className="financeTrust"><ShieldCheck size={18}/><span>Immutable ledger controls</span></div></div>
    {notice && <div className="financeNotice"><CheckCircle2 size={16}/>{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    <div className="financeTabs"><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>Overview</button><button className={view === "entry" ? "active" : ""} onClick={() => setView("entry")}>New transaction</button><button className={view === "conversion" ? "active" : ""} onClick={() => setView("conversion")}>Currency exchange</button><button className={view === "ledger" ? "active" : ""} onClick={() => setView("ledger")}>Ledger</button></div>
    {view === "overview" && <>
      <div className="financeStats"><FinanceStat label="Total income" value={formatMoney(totals.income, "ETB")} tone="positive" icon={<ArrowDownLeft size={18}/>} /><FinanceStat label="Total expenses" value={formatMoney(totals.expenses, "ETB")} tone="negative" icon={<ArrowUpRight size={18}/>} /><FinanceStat label="Conversion fees" value={formatMoney(totals.fees, "EUR")} tone="neutral" icon={<RefreshCw size={18}/>} /><FinanceStat label="Budget used" value={`${(utilization * 100).toFixed(1)}%`} tone={utilization >= .9 ? "negative" : "neutral"} icon={<WalletCards size={18}/>} /></div>
      <div className="financeGrid"><section className="financePanel"><div className="panelHeading"><div><span className="eyebrow">Available funds</span><h3>Currency-separated balances</h3></div><Coins size={20}/></div><div className="fundList">{funds.map((fund) => <div className="fundRow" key={fund.id}><div className={`currencyMark ${fund.currency.toLowerCase()}`}>{fund.currency}</div><div><strong>{fund.name}</strong><small>{fund.code} · No overdraft</small></div><b>{formatMoney(fund.balance, fund.currency)}</b></div>)}</div></section><section className="financePanel"><div className="panelHeading"><div><span className="eyebrow">Budget health</span><h3>Project operating budget</h3></div><span className="status-badge status-active">On track</span></div><div className="budgetAmount"><strong>{formatMoney(budget - spent, "ETB")}</strong><span>remaining of {formatMoney(budget, "ETB")}</span></div><div className="financeProgress"><i style={{ width: `${utilization * 100}%` }}/></div><div className="budgetMeta"><span>{formatMoney(spent, "ETB")} spent</span><span>80% warning threshold</span></div></section></div>
      <LedgerTable transactions={transactions.slice(0, 6)} />
    </>}
    {view === "entry" && <EntryForm entry={entry} funds={funds} updateEntry={updateEntry} postEntry={postEntry} />}
    {view === "conversion" && <ConversionForm conversion={conversion} funds={funds} updateConversion={updateConversion} postConversion={postConversion} selectedSource={selectedSource} selectedDestination={selectedDestination} convertedAmount={convertedAmount} totalDebit={totalDebit} />}
    {view === "ledger" && <LedgerTable transactions={transactions} />}
  </div>;
}

function FinanceStat({ label, value, tone, icon }) { return <div className={`financeStat ${tone}`}><div className="statIcon">{icon}</div><span>{label}</span><strong>{value}</strong></div>; }
function EntryForm({ entry, funds, updateEntry, postEntry }) { return <section className="financeForm"><div className="panelHeading"><div><span className="eyebrow">Controlled posting</span><h3>New debit or credit</h3></div><span className="formHint">Balances are calculated by the ledger</span></div><form onSubmit={postEntry} className="financeFormGrid"><label>Transaction type<select value={entry.type} onChange={(event) => updateEntry("type", event.target.value)}><option value="EXPENSE">Expense · Debit</option><option value="INCOME">Income · Credit</option></select></label><label>Fund<select value={entry.fundId} onChange={(event) => updateEntry("fundId", event.target.value)}>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name} ({fund.currency})</option>)}</select></label><label>Amount<input value={entry.amount} onChange={(event) => updateEntry("amount", event.target.value)} inputMode="decimal" placeholder="0.00" required /></label><label>Category<input value={entry.category} onChange={(event) => updateEntry("category", event.target.value)} placeholder="Category" /></label><label className="wide">Description<input value={entry.description} onChange={(event) => updateEntry("description", event.target.value)} placeholder="What is this movement for?" /></label><div className="formActions wide"><button className="primary"><CheckCircle2 size={16}/> Review and post</button></div></form></section>; }
function ConversionForm({ conversion, funds, updateConversion, postConversion, selectedSource, selectedDestination, convertedAmount, totalDebit }) { return <section className="financeForm"><div className="panelHeading"><div><span className="eyebrow">Fixed historical rate</span><h3>EUR → ETB conversion</h3></div><RefreshCw size={20}/></div><form onSubmit={postConversion} className="financeFormGrid"><label>Source fund<select value={conversion.sourceFundId} onChange={(event) => updateConversion("sourceFundId", event.target.value)}>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name} ({fund.currency})</option>)}</select></label><label>Destination fund<select value={conversion.destinationFundId} onChange={(event) => updateConversion("destinationFundId", event.target.value)}>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name} ({fund.currency})</option>)}</select></label><label>Source amount<input value={conversion.amount} onChange={(event) => updateConversion("amount", event.target.value)} inputMode="decimal" required /></label><label>Exchange rate<input value={conversion.rate} onChange={(event) => updateConversion("rate", event.target.value)} inputMode="decimal" required /></label><label>Conversion fee<input value={conversion.fee} onChange={(event) => updateConversion("fee", event.target.value)} inputMode="decimal" /></label><div className="conversionSummary wide"><span>{formatMoney(totalDebit, selectedSource?.currency || "EUR")} total debit</span><strong>↓</strong><span>{formatMoney(convertedAmount, selectedDestination?.currency || "ETB")} destination credit</span><small>Rate 1 {selectedSource?.currency || "EUR"} = {conversion.rate} {selectedDestination?.currency || "ETB"}. Historical rate is stored with the transaction.</small></div><div className="formActions wide"><button className="primary"><Send size={16}/> Review conversion</button></div></form></section>; }
function LedgerTable({ transactions }) { return <section className="financePanel ledgerPanel"><div className="panelHeading"><div><span className="eyebrow">Append-only activity</span><h3>Recent ledger movements</h3></div><span className="formHint">{transactions.length} records</span></div><div className="ledgerScroll"><table><thead><tr><th>Transaction</th><th>Date</th><th>Type</th><th>Fund</th><th>Movement</th><th>Status</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><small>{item.description}</small></td><td>{item.date}</td><td>{item.type.replaceAll("_", " ")}</td><td>{item.fund}</td><td className={item.direction === "CREDIT" ? "credit" : "debit"}>{item.direction === "CREDIT" ? "+" : "-"}{formatMoney(item.amount, item.currency)}</td><td><span className="status-badge status-completed">{item.status}</span></td></tr>)}</tbody></table></div></section>; }
