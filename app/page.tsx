'use client';

import {
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Gauge,
  Goal,
  HandCoins,
  Home,
  Inbox,
  Landmark,
  List,
  LogOut,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  Paperclip,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Sun,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  answerFinancialQuestion,
  budgetLevel,
  calculateFinancialSummary,
  demoFinanceData,
  emptyFinanceData,
  formatMoney,
  generateInsights,
  type Account,
  type FinanceData,
  type Movement,
  type MovementType,
} from '@/lib/finance';
import {
  clearLocalFinanceData,
  currentLocalUser,
  loadLocalFinanceData,
  registerLocalUser,
  saveLocalFinanceData,
  signInLocalUser,
  signOutLocalUser,
  type LocalUser,
} from '@/lib/local-account';
import {
  currentCloudUser,
  isCloudAuthConfigured,
  registerCloudUser,
  resendCloudConfirmation,
  signInCloudUser,
  signOutCloudUser,
} from '@/lib/cloud-auth';
import { parseReceiptText, type ReceiptDraft } from '@/lib/receipt';

type Summary = ReturnType<typeof calculateFinancialSummary>;
type EntityKind =
  | 'account'
  | 'card'
  | 'budget'
  | 'commitment'
  | 'goal'
  | 'recurring'
  | 'rule';
type DashboardPayload = {
  data: FinanceData;
  summary: Summary;
  insights: ReturnType<typeof generateInsights>;
};

const nav = [
  { label: 'Inicio', icon: Home },
  { label: 'Movimientos', icon: List },
  { label: 'Cuentas', icon: Landmark },
  { label: 'Tarjetas', icon: CreditCard },
  { label: 'Presupuestos', icon: WalletCards },
  { label: 'Pagos y pendientes', icon: CalendarDays },
  { label: 'Ahorro', icon: Goal },
  { label: 'Análisis', icon: BarChart3 },
  { label: 'Proyección', icon: Gauge },
  { label: 'Bandeja inteligente', icon: Inbox },
  { label: 'Asistente', icon: Bot },
];

export default function FinanceCopilot() {
  const [active, setActive] = useState('Inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [entity, setEntity] = useState<EntityKind | null>(null);
  const [data, setData] = useState<FinanceData>(
    structuredClone(demoFinanceData),
  );
  const dataRef = useRef<FinanceData>(structuredClone(demoFinanceData));
  const [summary, setSummary] = useState<Summary>(() =>
    calculateFinancialSummary(demoFinanceData),
  );
  const [insights, setInsights] = useState(() =>
    generateInsights(demoFinanceData),
  );
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const applyData = (next: FinanceData) => {
    const clean = { ...next, demoMode: false };
    dataRef.current = clean;
    setData(clean);
    setSummary(calculateFinancialSummary(clean));
    setInsights(generateInsights(clean));
    if (user) saveLocalFinanceData(user.email, clean);
  };

  const refresh = async () => {
    if (user) applyData(loadLocalFinanceData(user.email));
    setLoading(false);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem('suma-theme') as
      | 'light'
      | 'dark'
      | null;
    const initial =
      saved ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production')
        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      else
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ),
          )
          .catch(() => undefined);
    }
    async function restoreSession() {
      const session = isCloudAuthConfigured
        ? await currentCloudUser()
        : currentLocalUser();
      if (session) {
        const savedData = loadLocalFinanceData(session.email);
        setUser(session);
        dataRef.current = savedData;
        setData(savedData);
        setSummary(calculateFinancialSummary(savedData));
        setInsights(generateInsights(savedData));
      }
      setAuthReady(true);
      setLoading(false);
    }
    restoreSession().catch(() => {
      setAuthReady(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    document.title = user
      ? `Suma · ${user.name}`
      : 'Suma · Finanzas personales';
  }, [user]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  }
  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('suma-theme', next);
  }

  function addMovement(payload: Omit<Movement, 'id'>) {
    const movement: Movement = { ...payload, id: crypto.randomUUID() };
    const next = structuredClone(dataRef.current);
    next.movements = [movement, ...next.movements];
    if (movement.accountId) {
      const account = next.accounts.find(
        (item) => String(item.id) === String(movement.accountId),
      );
      if (account)
        account.balance +=
          movement.type === 'Ingreso' ? movement.amount : -movement.amount;
    }
    if (movement.destinationAccountId && movement.type === 'Transferencia') {
      const destination = next.accounts.find(
        (item) => String(item.id) === String(movement.destinationAccountId),
      );
      if (destination) destination.balance += movement.amount;
    }
    if (movement.cardId && movement.type === 'Gasto') {
      const card = next.cards.find(
        (item) => String(item.id) === String(movement.cardId),
      );
      if (card) card.used += movement.amount;
    }
    applyData(next);
    return movement;
  }

  function saveEntity(kind: EntityKind, values: Record<string, string>) {
    const next = structuredClone(dataRef.current);
    const id = crypto.randomUUID();
    if (kind === 'account')
      next.accounts.push({
        id,
        name: values.name,
        institution: values.institution || '',
        type: values.type || 'Cuenta bancaria',
        balance: Number(values.balance || 0),
        color: '#1d6b8f',
        active: true,
      });
    if (kind === 'card')
      next.cards.push({
        id,
        name: values.name,
        bank: values.bank || '',
        last4: values.last4,
        limit: Number(values.limit || 0),
        used: 0,
        closingDay: Number(values.closingDay || 1),
        dueDay: Number(values.dueDay || 1),
        nextPayment: 0,
        color: '#183b50',
        active: true,
      });
    if (kind === 'budget')
      next.budgets.push({
        id,
        name: values.name,
        category: values.category || 'Otros',
        limit: Number(values.limit || 0),
        spent: 0,
        month: new Date().toISOString().slice(0, 7),
      });
    if (kind === 'commitment')
      next.commitments.push({
        id,
        name: values.name,
        kind: (values.commitmentKind || 'Pagar') as
          | 'Pagar'
          | 'Cobrar'
          | 'Financiamiento',
        amount: Number(values.amount || 0),
        dueDate: values.dueDate,
        status: 'Pendiente',
        category: values.category || 'Otros',
        paidInstallments: 0,
      });
    if (kind === 'goal')
      next.goals.push({
        id,
        name: values.name,
        target: Number(values.target || 0),
        saved: Number(values.saved || 0),
        targetDate: values.targetDate,
        color: '#18815d',
      });
    if (kind === 'recurring')
      next.recurring.push({
        id,
        name: values.name,
        type: values.type === 'Ingreso' ? 'Ingreso' : 'Gasto',
        amount: Number(values.amount || 0),
        frequency: 'Mensual',
        nextDate: values.nextDate,
        account: '',
        category: values.category || 'Otros',
        active: true,
      });
    if (kind === 'rule')
      next.rules.push({
        id,
        contains: values.contains.toUpperCase(),
        category: values.category || 'Otros',
        subcategory: values.subcategory || '',
        active: true,
      });
    applyData(next);
  }

  function handleAuthenticated(nextUser: LocalUser) {
    setUser(nextUser);
    const savedData = loadLocalFinanceData(nextUser.email);
    dataRef.current = savedData;
    setData(savedData);
    setSummary(calculateFinancialSummary(savedData));
    setInsights(generateInsights(savedData));
  }

  if (!authReady) return <LoadingDashboard />;
  if (!user) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  const common = {
    data,
    summary,
    refresh,
    showNotice,
    openEntity: setEntity,
    openRegister: () => setRegisterOpen(true),
    applyData,
  };
  return (
    <main className="app-shell">
      <Sidebar
        active={active}
        onChange={setActive}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onRegister={() => setRegisterOpen(true)}
        user={user}
      />
      {menuOpen && (
        <button
          className="nav-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <section className="workspace">
        <Topbar
          onMenu={() => setMenuOpen(true)}
          theme={theme}
          onTheme={changeTheme}
          user={user}
          onLogout={async () => {
            if (isCloudAuthConfigured) await signOutCloudUser();
            else signOutLocalUser();
            setUser(null);
            setData(structuredClone(demoFinanceData));
          }}
        />
        <div className="page-wrap">
          {loading ? (
            <LoadingDashboard />
          ) : (
            <>
              {!data.movements.length && !data.accounts.length && (
                <DemoBanner onStart={() => setRegisterOpen(true)} />
              )}
              {active === 'Inicio' && (
                <Dashboard {...common} insights={insights} />
              )}
              {active === 'Movimientos' && <MovementsView {...common} />}
              {active === 'Cuentas' && <AccountsView {...common} />}
              {active === 'Tarjetas' && <CardsView {...common} />}
              {active === 'Presupuestos' && <BudgetsView {...common} />}
              {active === 'Pagos y pendientes' && <PaymentsView {...common} />}
              {active === 'Ahorro' && <SavingsView {...common} />}
              {active === 'Análisis' && <AnalysisView {...common} />}
              {active === 'Proyección' && <ProjectionView {...common} />}
              {active === 'Bandeja inteligente' && <SmartInbox {...common} />}
              {active === 'Asistente' && <AssistantView data={data} />}
              {active === 'Configuración' && (
                <SettingsView
                  {...common}
                  theme={theme}
                  onTheme={changeTheme}
                  user={user}
                  onClear={() => {
                    const clean = clearLocalFinanceData(user.email);
                    applyData(clean);
                    showNotice('Datos eliminados. Tu cuenta permanece activa.');
                  }}
                />
              )}
            </>
          )}
        </div>
      </section>
      <button
        className="mobile-fab"
        aria-label="Registrar movimiento"
        onClick={() => setRegisterOpen(true)}
      >
        <Plus />
      </button>
      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        data={data}
        onSaveMovement={addMovement}
        onSaved={async () => {
          showNotice('Movimiento registrado y saldos actualizados');
        }}
      />
      <EntityDialog
        kind={entity}
        onOpenChange={(open) => !open && setEntity(null)}
        onSaveEntity={saveEntity}
        onSaved={async () => {
          setEntity(null);
          showNotice('Información guardada');
        }}
      />
      {notice && (
        <div className="notice">
          <Check />
          {notice}
        </div>
      )}
    </main>
  );
}

function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: LocalUser) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'register' && name.trim().length < 2) {
      setError('Escribe tu nombre para crear la cuenta.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Escribe un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (isCloudAuthConfigured && mode === 'register') {
        const result = await registerCloudUser(name, normalizedEmail, password);
        if (result.confirmationRequired) {
          setConfirmationSent(true);
          return;
        }
        if (result.user) onAuthenticated(result.user);
      } else {
        const nextUser = isCloudAuthConfigured
          ? await signInCloudUser(normalizedEmail, password)
          : mode === 'register'
            ? await registerLocalUser(name, normalizedEmail, password)
            : await signInLocalUser(normalizedEmail, password);
        onAuthenticated(nextUser);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos completar el acceso.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    setBusy(true);
    setError('');
    try {
      await resendCloudConfirmation(email);
      setResent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos reenviar el correo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand auth-brand">
          <span>
            <TrendingUp />
          </span>
          <b>Suma</b>
        </div>
        <small>FINANZAS PERSONALES, SIN FRICCIÓN</small>
        <h1>
          Tu dinero claro.
          <br />
          Tus decisiones, mejores.
        </h1>
        <p>
          Registra compras con una foto, organiza tus gastos y consulta tu
          información con el asistente financiero.
        </p>
        <div className="auth-benefits">
          <span>
            <Camera />
            <b>Fotografía una boleta</b>
            <small>Leemos comercio, fecha y total.</small>
          </span>
          <span>
            <Bot />
            <b>Pregunta con naturalidad</b>
            <small>Respuestas calculadas con tus datos.</small>
          </span>
          <span>
            <ShieldCheck />
            <b>Espacio personal</b>
            <small>Tus datos quedan separados por cuenta.</small>
          </span>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setConfirmationSent(false);
              setError('');
            }}
          >
            Crear cuenta
          </button>
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setConfirmationSent(false);
              setError('');
            }}
          >
            Ingresar
          </button>
        </div>
        {confirmationSent ? (
          <div className="confirmation-sent" aria-live="polite">
            <span className="auth-icon success">
              <Mail />
            </span>
            <small>CONFIRMA TU IDENTIDAD</small>
            <h2>Revisa tu correo</h2>
            <p>
              Enviamos un enlace de confirmación a <b>{email}</b>. Ábrelo para
              activar tu cuenta y regresar a Suma.
            </p>
            <div className="confirmation-steps">
              <span>
                <b>1</b> Revisa entrada y spam
              </span>
              <span>
                <b>2</b> Abre el enlace de Suma
              </span>
              <span>
                <b>3</b> Ingresa con tu contraseña
              </span>
            </div>
            {resent && (
              <p className="form-success">Correo reenviado correctamente.</p>
            )}
            {error && (
              <p className="form-error">
                <AlertTriangle />
                {error}
              </p>
            )}
            <Button
              className="full-save"
              variant="outline"
              disabled={busy}
              onClick={resendConfirmation}
            >
              {busy ? <RefreshCw className="spin" /> : <Mail />}
              Reenviar correo
            </Button>
            <button
              className="auth-text-button"
              onClick={() => setConfirmationSent(false)}
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className="auth-icon">
                <UserRound />
              </span>
              <h2>
                {mode === 'register'
                  ? 'Crea tu espacio personal'
                  : 'Bienvenido de nuevo'}
              </h2>
              <p>
                {mode === 'register'
                  ? 'Empieza vacío y agrega únicamente tus datos reales.'
                  : 'Ingresa con la cuenta creada en este dispositivo.'}
              </p>
            </div>
            <form onSubmit={submit} noValidate>
              {mode === 'register' && (
                <Field label="Nombre">
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Tu nombre"
                    required
                  />
                </Field>
              )}
              <Field label="Correo electrónico">
                <input
                  autoFocus={mode === 'login'}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  required
                />
              </Field>
              <Field label="Contraseña">
                <input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </Field>
              {error && (
                <p className="form-error" role="alert" aria-live="assertive">
                  <AlertTriangle />
                  {error}
                </p>
              )}
              <Button type="submit" className="full-save" disabled={busy}>
                {busy ? <RefreshCw className="spin" /> : <ShieldCheck />}
                {mode === 'register' ? 'Crear mi cuenta' : 'Ingresar'}
              </Button>
            </form>
            <small className="local-security-note">
              {isCloudAuthConfigured
                ? 'Tu cuenta se activa mediante un enlace seguro enviado a tu correo.'
                : 'Modo de prueba: esta cuenta se guarda en este navegador. La verificación por correo se activará al conectar el servicio de cuentas en la nube.'}
            </small>
          </>
        )}
      </section>
    </main>
  );
}

function Sidebar({
  active,
  onChange,
  open,
  onClose,
  onRegister,
  user,
}: {
  active: string;
  onChange: (x: string) => void;
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  user: LocalUser;
}) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <span>
          <TrendingUp />
        </span>
        <b>Suma</b>
        <button className="close-nav" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>
      </div>
      <Button className="primary-register" onClick={onRegister}>
        <Plus /> Registrar movimiento
      </Button>
      <nav>
        {nav.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={active === label ? 'active' : ''}
            onClick={() => {
              onChange(label);
              onClose();
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="nav-bottom">
        <button
          className={active === 'Configuración' ? 'active' : ''}
          onClick={() => onChange('Configuración')}
        >
          <Settings />
          <span>Configuración</span>
        </button>
        <div className="user-chip">
          <span>{initials(user.name)}</span>
          <div>
            <b>{user.name}</b>
            <small>{user.email}</small>
          </div>
          <MoreHorizontal />
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  onMenu,
  theme,
  onTheme,
  user,
  onLogout,
}: {
  onMenu: () => void;
  theme: string;
  onTheme: () => void;
  user: LocalUser;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Abrir menú">
        <Menu />
      </button>
      <div className="global-search">
        <Search />
        <input
          placeholder="Buscar movimientos, comercios o categorías"
          aria-label="Buscar"
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <span className="private-badge">
          <ShieldCheck /> Datos protegidos
        </span>
        <button onClick={onTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
        <button className="notification-button" aria-label="Notificaciones">
          <Bell />
          <i />
        </button>
        <span className="top-avatar" title={user.email}>
          {initials(user.name)}
        </span>
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut />
        </button>
      </div>
    </header>
  );
}

function DemoBanner({ onStart }: { onStart: () => void }) {
  return (
    <div className="demo-banner">
      <span>
        <Sparkles />
      </span>
      <div>
        <b>Tu espacio está listo y vacío</b>
        <small>
          Registra una compra manualmente o toma una foto de una boleta para
          comenzar.
        </small>
      </div>
      <Button variant="outline" onClick={onStart}>
        Registrar mi primer gasto <ArrowUpRight />
      </Button>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard({ data, summary, insights, openRegister, openEntity }: any) {
  const upcoming = data.commitments
    .filter((c: any) => c.status !== 'Pagado')
    .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const today = new Date();
  const todayLabel = today
    .toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    .replace('.', '');
  const monthLabel = today.toLocaleDateString('es-PE', { month: 'long' });
  const nextCommitment = upcoming[0];
  const nextIncome = data.recurring
    .filter((item: any) => item.type === 'Ingreso' && item.active)
    .sort((a: any, b: any) => a.nextDate.localeCompare(b.nextDate))[0];
  return (
    <>
      <PageHeader
        eyebrow="Centro financiero personal"
        title="Resumen ejecutivo"
        subtitle="Posición, liquidez y compromisos consolidados en una sola vista."
        action={
          <Button onClick={openRegister}>
            <Plus /> Nueva operación
          </Button>
        }
      />
      <section
        className="operations-status"
        aria-label="Estado de fuentes y actualización"
      >
        <div>
          <span className="status-pulse" />
          <p>
            <b>Información consolidada</b>
            <small>Actualizado en este dispositivo</small>
          </p>
        </div>
        <div>
          <Mail />
          <p>
            <b>Motor Gmail preparado</b>
            <small>BCP e Interbank · OAuth seguro</small>
          </p>
        </div>
        <div>
          <ShieldCheck />
          <p>
            <b>Control y trazabilidad</b>
            <small>Detecciones sujetas a revisión</small>
          </p>
        </div>
      </section>
      <section className="kpi-grid">
        <Kpi
          label="Liquidez total"
          value={formatMoney(summary.available)}
          note="Cuentas, billeteras y efectivo"
          icon={<WalletCards />}
          tone="violet"
        />
        <Kpi
          label="Gastos del mes"
          value={formatMoney(summary.expenses)}
          note="Movimientos confirmados del mes"
          icon={<TrendingDown />}
        />
        <Kpi
          label="Deuda actual"
          value={formatMoney(summary.debt)}
          note={`${formatMoney(summary.cardDebt)} en tarjetas`}
          icon={<CreditCard />}
          tone="amber"
        />
        <Kpi
          label="Patrimonio neto"
          value={formatMoney(summary.netWorth)}
          note="Activos menos pasivos"
          icon={<Landmark />}
          tone="green"
        />
        <Kpi
          label="Tasa de ahorro"
          value={`${summary.savingsRate.toFixed(1)}%`}
          note={`${formatMoney(summary.savings)} este mes`}
          icon={<PiggyBank />}
          tone="blue"
        />
      </section>
      <section className="today-strip">
        <div className="today-label">
          <span>HOY</span>
          <b>{todayLabel}</b>
        </div>
        <TodayStat
          label="Egresos procesados"
          value={formatMoney(summary.todayExpenses)}
        />
        <TodayStat
          label="Ingresos procesados"
          value={formatMoney(summary.todayIncome)}
        />
        <TodayStat
          label="Control pendiente"
          value={`${summary.needsReview} movimientos`}
        />
        <TodayStat
          label="Próximo compromiso"
          value={
            nextCommitment
              ? `${nextCommitment.name} · ${shortDate(nextCommitment.dueDate)}`
              : 'Sin pendientes'
          }
        />
      </section>
      <section className="decision-grid">
        <article className="spendable-card">
          <div className="spendable-head">
            <span>
              <CircleDollarSign />
            </span>
            <div>
              <small>DISPONIBLE REAL PARA GASTAR</small>
              <h2>{formatMoney(summary.availableToSpend)}</h2>
            </div>
          </div>
          <p>
            No es tu saldo bancario. Ya descontamos tarjetas, compromisos,
            presupuesto reservado y un colchón de{' '}
            {formatMoney(summary.securityCushion)}.
          </p>
          <div className="spend-breakdown">
            <span>
              <small>En cuentas</small>
              <b>{formatMoney(summary.available)}</b>
            </span>
            <i />
            <span>
              <small>Compromisos</small>
              <b>
                -
                {formatMoney(
                  summary.pendingPayments +
                    data.cards.reduce(
                      (s: number, c: any) => s + c.nextPayment,
                      0,
                    ),
                )}
              </b>
            </span>
            <i />
            <span>
              <small>Disponible</small>
              <b>{formatMoney(summary.availableToSpend)}</b>
            </span>
          </div>
        </article>
        <article className="next-income-card">
          <span className="calendar-icon">
            <CalendarDays />
          </span>
          <small>HASTA TU PRÓXIMO INGRESO</small>
          <h2>{formatMoney(summary.untilNextIncome)}</h2>
          <div>
            <span>
              <b>{summary.daysToIncome}</b>
              <small>días restantes</small>
            </span>
            <span>
              <b>{formatMoney(summary.dailyRecommended)}</b>
              <small>recomendado por día</small>
            </span>
          </div>
          <p>
            {nextIncome
              ? `Próximo ingreso esperado · ${shortDate(nextIncome.nextDate)}`
              : 'Registra un ingreso recurrente para proyectar'}
          </p>
        </article>
      </section>
      <section className="dashboard-columns">
        <div className="dashboard-main">
          <Panel
            title="Flujo del mes"
            subtitle="Ingresos, gastos y saldo neto"
            action={
              <button>
                {monthLabel} <ChevronDown />
              </button>
            }
          >
            <div className="flow-summary">
              <div>
                <span>Ingresos</span>
                <b className="positive">{formatMoney(summary.income)}</b>
              </div>
              <div>
                <span>Gastos</span>
                <b>{formatMoney(summary.expenses)}</b>
              </div>
              <div>
                <span>Flujo neto</span>
                <b>{formatMoney(summary.netFlow)}</b>
              </div>
            </div>
            <FlowChart />
          </Panel>
          <Panel
            title="Movimientos recientes"
            subtitle="Actualizados desde todos tus canales"
            action={
              <button>
                Ver todos <ArrowUpRight />
              </button>
            }
          >
            <div className="movement-table compact">
              {data.movements.slice(0, 5).map((m: Movement) => (
                <MovementRow movement={m} data={data} key={m.id} />
              ))}
            </div>
          </Panel>
        </div>
        <div className="dashboard-side">
          <Panel
            title="Próximos pagos"
            subtitle="Máximo 5 compromisos"
            action={<button>Calendario</button>}
          >
            {upcoming.map((item: any) => (
              <div className="upcoming-row" key={item.id}>
                <DateBadge date={item.dueDate} />
                <div>
                  <b>{item.name}</b>
                  <small>
                    {item.kind} · {item.category}
                  </small>
                </div>
                <strong className={item.kind === 'Cobrar' ? 'positive' : ''}>
                  {item.kind === 'Cobrar' ? '+' : '-'}{' '}
                  {formatMoney(item.amount)}
                </strong>
              </div>
            ))}
          </Panel>
          <Panel title="Insights" subtitle="Calculados con tus datos">
            {insights.map((item: any) => (
              <div className={`insight ${item.tone}`} key={item.title}>
                <span>
                  {item.tone === 'warning' ? <AlertTriangle /> : <Sparkles />}
                </span>
                <div>
                  <b>{item.title}</b>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Tarjetas" subtitle="Resumen de crédito">
            <div className="card-summary">
              <div>
                <small>Deuda total</small>
                <b>{formatMoney(summary.cardDebt)}</b>
              </div>
              <div>
                <small>Próximo vencimiento</small>
                <b>22 sep</b>
              </div>
              <div>
                <small>Línea disponible</small>
                <b>
                  {formatMoney(
                    data.cards.reduce(
                      (s: number, c: any) => s + c.limit - c.used,
                      0,
                    ),
                  )}
                </b>
              </div>
            </div>
          </Panel>
        </div>
      </section>
      <section className="quick-actions">
        <button onClick={() => openEntity('account')}>
          <Landmark />
          <span>
            <b>Nueva cuenta</b>
            <small>Banco, billetera o efectivo</small>
          </span>
          <ArrowUpRight />
        </button>
        <button onClick={() => openEntity('budget')}>
          <WalletCards />
          <span>
            <b>Crear presupuesto</b>
            <small>Define límites claros</small>
          </span>
          <ArrowUpRight />
        </button>
        <button onClick={() => openEntity('commitment')}>
          <CalendarDays />
          <span>
            <b>Registrar pendiente</b>
            <small>Por pagar o por cobrar</small>
          </span>
          <ArrowUpRight />
        </button>
      </section>
    </>
  );
}

function Kpi({
  label,
  value,
  note,
  icon,
  tone = '',
  trend,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone?: string;
  trend?: string;
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div>
        <span>{icon}</span>
        {trend && (
          <em>
            <ArrowDownRight /> 8%
          </em>
        )}
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}
function TodayStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="today-stat">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </article>
  );
}

function MovementsView({ data, showNotice, openRegister, applyData }: any) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Todos');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Array<number | string>>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filtered = useMemo(
    () =>
      data.movements.filter(
        (m: Movement) =>
          (type === 'Todos' || m.type === type) &&
          `${m.description} ${m.merchant ?? ''} ${m.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data.movements, search, type],
  );
  const pageSize = 7;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  function exportCsv() {
    const rows = [
      [
        'Fecha',
        'Descripción',
        'Comercio',
        'Categoría',
        'Tipo',
        'Monto',
        'Estado',
      ],
      ...filtered.map((m: Movement) => [
        m.movementDate,
        m.description,
        m.merchant || '',
        m.category,
        m.type,
        String(m.amount),
        m.status,
      ]),
    ];
    downloadBlob(
      rows.map((r) => r.map(csvCell).join(',')).join('\n'),
      'movimientos-suma.csv',
      'text/csv;charset=utf-8',
    );
  }
  async function bulk(action: 'review' | 'exclude' | 'delete') {
    const next = structuredClone(data) as FinanceData;
    next.movements =
      action === 'delete'
        ? next.movements.filter((movement) => !selected.includes(movement.id))
        : next.movements.map((movement) =>
            selected.includes(movement.id)
              ? {
                  ...movement,
                  ...(action === 'review'
                    ? { reviewed: true, status: 'Confirmado' }
                    : { excludeBudget: true }),
                }
              : movement,
          );
    applyData(next);
    setSelected([]);
    showNotice(
      action === 'delete'
        ? 'Movimientos eliminados'
        : 'Movimientos actualizados',
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Historial central"
        title="Movimientos"
        subtitle={`${filtered.length} operaciones en el resultado actual`}
        action={
          <div className="header-actions">
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Exportar CSV
            </Button>
            <Button onClick={openRegister}>
              <Plus /> Registrar
            </Button>
          </div>
        }
      />
      <div className="movement-toolbar">
        <div className="search-field">
          <Search />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar Plaza Vea, transporte..."
          />
        </div>
        <div className="filter-pills">
          {['Todos', 'Gasto', 'Ingreso', 'Transferencia'].map((item) => (
            <button
              className={type === item ? 'active' : ''}
              onClick={() => {
                setType(item);
                setPage(1);
              }}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="filter-button">
          <SlidersHorizontal /> Más filtros
        </button>
      </div>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <b>{selected.length} seleccionados</b>
          <button onClick={() => bulk('review')}>
            <Check /> Marcar revisados
          </button>
          <button onClick={() => bulk('exclude')}>
            <Eye /> Excluir de presupuesto
          </button>
          <button className="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Eliminar
          </button>
          <button onClick={() => setSelected([])}>
            <X />
          </button>
        </div>
      )}
      <Panel title="Todas las operaciones" className="movement-panel">
        <div className="movement-head">
          <input
            type="checkbox"
            checked={
              visible.length > 0 &&
              visible.every((m: Movement) => selected.includes(m.id))
            }
            onChange={(e) =>
              setSelected(
                e.target.checked ? visible.map((m: Movement) => m.id) : [],
              )
            }
          />
          <span>Movimiento</span>
          <span>Cuenta / medio</span>
          <span>Estado</span>
          <span>Monto</span>
          <span />
        </div>
        {visible.length ? (
          <div className="movement-table">
            {visible.map((m: Movement) => (
              <MovementRow
                key={m.id}
                movement={m}
                data={data}
                selectable
                selected={selected.includes(m.id)}
                onSelect={(checked) =>
                  setSelected(
                    checked
                      ? [...selected, m.id]
                      : selected.filter((id) => id !== m.id),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ReceiptText />}
            title="No hay movimientos con estos filtros"
            action="Limpiar filtros"
            onAction={() => {
              setSearch('');
              setType('Todos');
            }}
          />
        )}
        <div className="pagination">
          <span>
            Página {page} de {pages}
          </span>
          <div>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft />
            </button>
            <button disabled={page === pages} onClick={() => setPage(page + 1)}>
              <ChevronRight />
            </button>
          </div>
        </div>
      </Panel>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {selected.length} movimientos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará los registros seleccionados. Los totales se
              recalcularán inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => bulk('delete')}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MovementRow({
  movement: m,
  data,
  selectable,
  selected,
  onSelect,
}: {
  movement: Movement;
  data: FinanceData;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (x: boolean) => void;
}) {
  const account = data.accounts.find(
    (a) => String(a.id) === String(m.accountId),
  );
  const card = data.cards.find((c) => String(c.id) === String(m.cardId));
  return (
    <div
      className={`movement-row ${m.status === 'Revisar' ? 'needs-review' : ''}`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(e.target.checked)}
        />
      )}
      <span className={`movement-source ${m.type.toLowerCase()}`}>
        {m.type === 'Ingreso' ? (
          <ArrowDownLeft />
        ) : m.type === 'Transferencia' ? (
          <ArrowLeftRight />
        ) : (
          <ArrowUpRight />
        )}
      </span>
      <div className="movement-main">
        <b>{m.merchant || m.description}</b>
        <small>
          {m.description}
          {m.attachmentCount ? (
            <em>
              <Paperclip />
              {m.attachmentCount}
            </em>
          ) : null}
        </small>
        <div>
          <span>
            {m.category}
            {m.subcategory ? ` › ${m.subcategory}` : ''}
          </span>
          <span>{m.source}</span>
        </div>
      </div>
      <div className="movement-account">
        <b>
          {card
            ? `${card.bank} •${card.last4}`
            : account?.name || m.paymentMethod}
        </b>
        <small>{m.paymentMethod}</small>
      </div>
      <span className={`status-chip ${m.status.toLowerCase()}`}>
        {m.status}
      </span>
      <div
        className={`movement-value ${m.type === 'Ingreso' ? 'positive' : m.type === 'Transferencia' ? 'transfer' : ''}`}
      >
        <b>
          {m.type === 'Ingreso' ? '+' : m.type === 'Transferencia' ? '↔' : '-'}{' '}
          {formatMoney(m.amount)}
        </b>
        <small>{shortDate(m.movementDate)}</small>
      </div>
      <button className="row-menu">
        <MoreHorizontal />
      </button>
    </div>
  );
}

function AccountsView({ data, summary, openEntity }: any) {
  return (
    <>
      <PageHeader
        eyebrow="Dónde está tu dinero"
        title="Cuentas"
        subtitle="Bancos, billeteras y efectivo en un solo lugar"
        action={
          <Button onClick={() => openEntity('account')}>
            <Plus /> Nueva cuenta
          </Button>
        }
      />
      <section className="account-summary">
        <div>
          <small>Total disponible</small>
          <h2>{formatMoney(summary.available)}</h2>
          <p>No incluye líneas de crédito.</p>
        </div>
        <div>
          <span>
            <Landmark />
          </span>
          <p>
            <b>{data.accounts.length}</b> cuentas activas
          </p>
        </div>
        <div>
          <span>
            <HandCoins />
          </span>
          <p>
            <b>
              {formatMoney(
                data.accounts.find((a: Account) => a.type === 'Efectivo')
                  ?.balance || 0,
              )}
            </b>{' '}
            en efectivo
          </p>
        </div>
      </section>
      <section className="entity-grid accounts-grid">
        {data.accounts.map((account: Account) => (
          <article className="account-card" key={account.id}>
            <header>
              <span style={{ background: account.color }}>
                <Landmark />
              </span>
              <button>
                <MoreHorizontal />
              </button>
            </header>
            <small>{account.institution || account.type}</small>
            <h3>{account.name}</h3>
            <strong>{formatMoney(account.balance)}</strong>
            <div>
              <span>{account.type}</span>
              <button>
                Ver movimientos <ArrowUpRight />
              </button>
            </div>
          </article>
        ))}
      </section>
      <Panel title="Evolución del disponible" subtitle="Últimos 6 meses">
        <MiniLineChart
          values={[
            summary.available,
            summary.available,
            summary.available,
            summary.available,
            summary.available,
            summary.available,
          ]}
        />
      </Panel>
    </>
  );
}

function CardsView({ data, summary, openEntity }: any) {
  return (
    <>
      <PageHeader
        eyebrow="Crédito bajo control"
        title="Tarjetas"
        subtitle="Consumo, deuda y próximos vencimientos"
        action={
          <Button onClick={() => openEntity('card')}>
            <Plus /> Nueva tarjeta
          </Button>
        }
      />
      <section className="credit-overview">
        <Kpi
          label="Deuda total"
          value={formatMoney(summary.cardDebt)}
          note="En todas tus tarjetas"
          icon={<CreditCard />}
          tone="amber"
        />
        <Kpi
          label="Línea disponible"
          value={formatMoney(
            data.cards.reduce((s: number, c: any) => s + c.limit - c.used, 0),
          )}
          note="Crédito aún no utilizado"
          icon={<CircleDollarSign />}
          tone="green"
        />
        <Kpi
          label="Próximo pago"
          value={formatMoney(data.cards[0]?.nextPayment || 0)}
          note={
            data.cards[0]
              ? `${data.cards[0].bank} · día ${data.cards[0].dueDay}`
              : 'Sin tarjetas registradas'
          }
          icon={<CalendarDays />}
          tone="violet"
        />
      </section>
      <section className="credit-card-grid">
        {data.cards.map((card: any) => {
          const pct = Math.round((card.used / card.limit) * 100);
          return (
            <article className="credit-card-item" key={card.id}>
              <div
                className="credit-visual"
                style={{ '--card-color': card.color } as any}
              >
                <div>
                  <span>{card.bank}</span>
                  <CreditCard />
                </div>
                <strong>{card.name}</strong>
                <p>•••• •••• •••• {card.last4}</p>
                <small>
                  CIERRE {card.closingDay} · PAGO {card.dueDay}
                </small>
              </div>
              <div className="credit-detail">
                <header>
                  <div>
                    <small>Utilizado</small>
                    <b>{formatMoney(card.used)}</b>
                  </div>
                  <span>{pct}%</span>
                </header>
                <div className="progress">
                  <i style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="credit-numbers">
                  <span>
                    <small>Línea</small>
                    <b>{formatMoney(card.limit)}</b>
                  </span>
                  <span>
                    <small>Disponible</small>
                    <b>{formatMoney(card.limit - card.used)}</b>
                  </span>
                  <span>
                    <small>Próximo pago</small>
                    <b>{formatMoney(card.nextPayment)}</b>
                  </span>
                </div>
                <Button variant="outline">Ver consumos y cuotas</Button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function BudgetsView({ data, openEntity }: any) {
  const total = data.budgets.reduce((s: number, b: any) => s + b.limit, 0);
  const spent = data.budgets.reduce((s: number, b: any) => s + b.spent, 0);
  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('es-PE', {
          month: 'long',
          year: 'numeric',
        })}
        title="Presupuestos"
        subtitle="Límites visibles antes de tomar decisiones"
        action={
          <Button onClick={() => openEntity('budget')}>
            <Plus /> Crear presupuesto
          </Button>
        }
      />
      <section className="budget-hero">
        <div>
          <small>PRESUPUESTO MENSUAL</small>
          <h2>{formatMoney(total)}</h2>
          <p>
            {formatMoney(spent)} usados · {formatMoney(total - spent)}{' '}
            disponibles
          </p>
        </div>
        <ProgressRing value={Math.round((spent / total) * 100)} />
      </section>
      <section className="budget-grid">
        {data.budgets.map((budget: any) => {
          const level = budgetLevel(budget.spent, budget.limit);
          return (
            <article className="budget-card" key={budget.id}>
              <header>
                <div>
                  <span className={`budget-dot ${level.tone}`}>
                    {budget.name[0]}
                  </span>
                  <div>
                    <h3>{budget.name}</h3>
                    <small>{budget.category}</small>
                  </div>
                </div>
                <button>
                  <MoreHorizontal />
                </button>
              </header>
              <div className="budget-amounts">
                <span>
                  <small>Gastado</small>
                  <b>{formatMoney(budget.spent)}</b>
                </span>
                <span>
                  <small>Disponible</small>
                  <b>{formatMoney(Math.max(0, budget.limit - budget.spent))}</b>
                </span>
              </div>
              <div className="progress">
                <i
                  className={level.tone}
                  style={{ width: `${Math.min(100, level.percentage)}%` }}
                />
              </div>
              <footer>
                <span className={`level ${level.tone}`}>{level.label}</span>
                <b>
                  {level.percentage}% de {formatMoney(budget.limit)}
                </b>
              </footer>
            </article>
          );
        })}
      </section>
    </>
  );
}

function PaymentsView({ data, openEntity }: any) {
  const days = ['18', '20', '22', '25', '30'];
  return (
    <>
      <PageHeader
        eyebrow="Compromisos y calendario"
        title="Pagos y pendientes"
        subtitle="Cuotas, financiamientos y cobros por venir"
        action={
          <Button onClick={() => openEntity('commitment')}>
            <Plus /> Nuevo pendiente
          </Button>
        }
      />
      <div className="payment-tabs">
        <button className="active">Próximos</button>
        <button>Por pagar</button>
        <button>Por cobrar</button>
        <button>Financiamientos</button>
        <button>Recurrentes</button>
      </div>
      <section className="payments-layout">
        <Panel title="Calendario financiero" subtitle="Septiembre 2026">
          <div className="calendar-week">
            <span>LUN</span>
            <span>MAR</span>
            <span>MIÉ</span>
            <span>JUE</span>
            <span>VIE</span>
            <span>SÁB</span>
            <span>DOM</span>
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 1;
              const marked = days.includes(String(day));
              return (
                <button
                  key={i}
                  className={`${day === 18 ? 'today' : ''} ${marked ? 'marked' : ''}`}
                  disabled={day < 1 || day > 30}
                >
                  {day > 0 && day <= 30 ? day : ''}
                  {marked && <i />}
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="Línea de tiempo" subtitle="Eventos que cambian tu flujo">
          {[
            ...data.recurring.map((r: any) => ({
              ...r,
              kind: r.type,
              dueDate: r.nextDate,
            })),
            ...data.commitments,
          ]
            .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, 7)
            .map((item: any) => (
              <div className="timeline-item" key={`${item.id}-${item.dueDate}`}>
                <DateBadge date={item.dueDate} />
                <div>
                  <b>{item.name}</b>
                  <small>
                    {item.kind} · {item.status || item.frequency}
                  </small>
                </div>
                <strong
                  className={
                    item.kind === 'Ingreso' || item.kind === 'Cobrar'
                      ? 'positive'
                      : ''
                  }
                >
                  {item.kind === 'Ingreso' || item.kind === 'Cobrar'
                    ? '+'
                    : '-'}{' '}
                  {formatMoney(item.amount)}
                </strong>
                <button>
                  <Check />
                </button>
              </div>
            ))}
        </Panel>
      </section>
      <Panel
        title="Financiamientos"
        subtitle="Saldo, cuotas y próximo vencimiento"
        action={
          <button onClick={() => openEntity('recurring')}>
            Agregar recurrente <Plus />
          </button>
        }
      >
        {data.commitments
          .filter((c: any) => c.kind === 'Financiamiento')
          .map((item: any) => (
            <div className="financing-row" key={item.id}>
              <span>
                <CircleDollarSign />
              </span>
              <div>
                <b>{item.name}</b>
                <small>
                  {item.paidInstallments} de {item.installments} cuotas pagadas
                </small>
                <div className="progress">
                  <i
                    style={{
                      width: `${(item.paidInstallments / item.installments) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <small>Saldo pendiente</small>
                <b>{formatMoney(item.outstanding)}</b>
              </div>
              <div>
                <small>Próximo pago</small>
                <b>{shortDate(item.dueDate)}</b>
              </div>
              <Button variant="outline">Ver detalle</Button>
            </div>
          ))}
      </Panel>
    </>
  );
}

function SavingsView({ data, openEntity, applyData, showNotice }: any) {
  async function contribute(goal: any) {
    const amount = window.prompt(`¿Cuánto quieres aportar a ${goal.name}?`);
    if (!amount) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    applyData({
      ...data,
      goals: data.goals.map((item: any) =>
        item.id === goal.id ? { ...item, saved: item.saved + value } : item,
      ),
    });
    showNotice('Aporte registrado');
  }
  return (
    <>
      <PageHeader
        eyebrow="Avanza con intención"
        title="Metas de ahorro"
        subtitle="Cada aporte acerca una decisión importante"
        action={
          <Button onClick={() => openEntity('goal')}>
            <Plus /> Nueva meta
          </Button>
        }
      />
      <section className="savings-total">
        <div>
          <small>AHORRO EN METAS</small>
          <h2>
            {formatMoney(
              data.goals.reduce((s: number, g: any) => s + g.saved, 0),
            )}
          </h2>
          <p>
            <TrendingUp />{' '}
            {data.goals.length
              ? `${data.goals.length} metas activas`
              : 'Crea tu primera meta'}
          </p>
        </div>
        <PiggyBank />
      </section>
      <section className="goal-grid">
        {data.goals.map((goal: any) => {
          const pct = Math.min(
            100,
            Math.round((goal.saved / goal.target) * 100),
          );
          return (
            <article className="goal-card" key={goal.id}>
              <header>
                <span
                  style={{ background: `${goal.color}18`, color: goal.color }}
                >
                  <Goal />
                </span>
                <button>
                  <MoreHorizontal />
                </button>
              </header>
              <small>FECHA OBJETIVO · {shortDate(goal.targetDate)}</small>
              <h3>{goal.name}</h3>
              <strong>
                {formatMoney(goal.saved)} <em>de {formatMoney(goal.target)}</em>
              </strong>
              <div className="progress">
                <i style={{ width: `${pct}%`, background: goal.color }} />
              </div>
              <footer>
                <b>{pct}% completado</b>
                <span>
                  Faltan {formatMoney(Math.max(0, goal.target - goal.saved))}
                </span>
              </footer>
              <Button variant="outline" onClick={() => contribute(goal)}>
                <Plus /> Hacer aporte
              </Button>
            </article>
          );
        })}
      </section>
    </>
  );
}

function AnalysisView({ data, summary }: any) {
  const cats = Object.entries(
    data.movements
      .filter((m: Movement) => m.type === 'Gasto' && m.status === 'Confirmado')
      .reduce(
        (acc: Record<string, number>, m: Movement) => ({
          ...acc,
          [m.category]: (acc[m.category] || 0) + m.amount,
        }),
        {},
      ),
  ).sort((a: any, b: any) => b[1] - a[1]);
  const max = Math.max(...cats.map((x: any) => x[1]), 1);
  const merchants = Object.entries(
    data.movements
      .filter((movement: Movement) => movement.type === 'Gasto')
      .reduce((totals: Record<string, number>, movement: Movement) => {
        const name = movement.merchant || movement.description;
        totals[name] = (totals[name] || 0) + movement.amount;
        return totals;
      }, {}),
  ).sort((a: any, b: any) => b[1] - a[1]);
  return (
    <>
      <PageHeader
        eyebrow="Decisiones con contexto"
        title="Análisis"
        subtitle="Pocos gráficos, respuestas claras"
      />
      <section className="comparison-grid">
        <Kpi
          label="Gastos del mes"
          value={formatMoney(summary.expenses)}
          note={`${data.movements.filter((item: Movement) => item.type === 'Gasto').length} gastos registrados`}
          icon={<TrendingDown />}
          tone="green"
        />
        <Kpi
          label="Ingresos del mes"
          value={formatMoney(summary.income)}
          note={`${data.movements.filter((item: Movement) => item.type === 'Ingreso').length} ingresos registrados`}
          icon={<TrendingUp />}
          tone="blue"
        />
        <Kpi
          label="Categoría principal"
          value={(cats[0]?.[0] as string) || 'Sin datos'}
          note={
            cats[0]
              ? formatMoney(cats[0][1] as number)
              : 'Registra gastos para analizar'
          }
          icon={<Store />}
          tone="amber"
        />
      </section>
      <section className="analytics-grid">
        <Panel title="Ingresos vs gastos" subtitle="Últimos seis meses">
          <MonthBars income={summary.income} expenses={summary.expenses} />
        </Panel>
        <Panel title="Gastos por categoría" subtitle="Distribución del mes">
          <div className="donut-area">
            <div className="donut-chart">
              <span>
                <b>{formatMoney(summary.expenses)}</b>
                <small>Total</small>
              </span>
            </div>
            <div className="donut-legend">
              {cats.slice(0, 5).map(([name, value]: any, i: number) => (
                <div key={name}>
                  <i className={`c${i}`} />
                  <span>{name}</span>
                  <b>{Math.round((value / summary.expenses) * 100)}%</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>
      <section className="analytics-grid">
        <Panel title="Top categorías" subtitle="Por monto acumulado">
          <div className="ranking-bars">
            {cats.slice(0, 6).map(([name, value]: any) => (
              <div key={name}>
                <span>{name}</span>
                <div>
                  <i style={{ width: `${(value / max) * 100}%` }} />
                </div>
                <b>{formatMoney(value)}</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top comercios" subtitle="Este mes">
          {merchants.slice(0, 5).map(([name, value], i) => (
            <div className="merchant-row" key={name as string}>
              <em>{i + 1}</em>
              <span>{name}</span>
              <b>{formatMoney(value as number)}</b>
            </div>
          ))}
        </Panel>
      </section>
      <Panel
        title="Evolución patrimonial"
        subtitle="Activos, deuda y patrimonio neto"
      >
        <MiniLineChart
          values={[
            summary.netWorth,
            summary.netWorth,
            summary.netWorth,
            summary.netWorth,
            summary.netWorth,
            summary.netWorth,
          ]}
          second={[
            summary.debt,
            summary.debt,
            summary.debt,
            summary.debt,
            summary.debt,
            summary.debt,
          ]}
        />
      </Panel>
    </>
  );
}

function ProjectionView({ data, summary }: any) {
  const points = [
    summary.available,
    summary.available - 149.9,
    summary.available - 1469.9,
    summary.available - 1509.8,
    summary.available + 1690.2,
    summary.projection.base,
  ];
  return (
    <>
      <PageHeader
        eyebrow="Anticípate al cierre"
        title="Proyección"
        subtitle="Qué pasará con tu saldo si mantienes el ritmo actual"
      />
      <section className="projection-hero">
        <div>
          <small>SALDO PROYECTADO AL 30 SEP</small>
          <h2>{formatMoney(summary.projection.base)}</h2>
          <p>
            Escenario base · incluye ingresos, pagos, cuotas y gasto variable
            esperado.
          </p>
        </div>
        <div className="scenario-pills">
          <span>
            <small>Conservador</small>
            <b>{formatMoney(summary.projection.conservative)}</b>
          </span>
          <span className="active">
            <small>Base</small>
            <b>{formatMoney(summary.projection.base)}</b>
          </span>
          <span>
            <small>Optimista</small>
            <b>{formatMoney(summary.projection.optimistic)}</b>
          </span>
        </div>
      </section>
      <Panel
        title="Flujo proyectado"
        subtitle="Cómo cambia el saldo desde hoy hasta fin de mes"
      >
        <ProjectionChart values={points} />
        <div className="projection-labels">
          <span>Hoy</span>
          <span>Internet</span>
          <span>Tarjeta</span>
          <span>Netflix</span>
          <span>Ingreso</span>
          <span>Fin de mes</span>
        </div>
      </Panel>
      <section className="projection-grid">
        <Panel
          title="Cálculo del escenario base"
          subtitle="Una sola fórmula para toda la plataforma"
        >
          <div className="calculation">
            <CalcRow
              label="Saldo disponible actual"
              value={summary.available}
            />
            <CalcRow
              label="Ingresos pendientes"
              value={data.recurring
                .filter((r: any) => r.type === 'Ingreso')
                .reduce((s: number, r: any) => s + r.amount, 0)}
              positive
            />
            <CalcRow
              label="Pagos y compromisos"
              value={summary.pendingPayments}
              negative
            />
            <CalcRow
              label="Pagos de tarjetas"
              value={data.cards.reduce(
                (s: number, c: any) => s + c.nextPayment,
                0,
              )}
              negative
            />
            <CalcRow label="Gastos variables estimados" value={900} negative />
            <div className="calc-total">
              <b>Saldo esperado</b>
              <strong>{formatMoney(summary.projection.base)}</strong>
            </div>
          </div>
        </Panel>
        <Panel
          title="Timeline financiero"
          subtitle="Momentos que cambian tu posición"
        >
          <div className="projection-timeline">
            <div className="done">
              <span />
              <b>Hoy</b>
              <small>{formatMoney(summary.available)}</small>
            </div>
            <div>
              <span />
              <b>22 sep · Tarjeta</b>
              <small>-S/ 1,320</small>
            </div>
            <div>
              <span />
              <b>25 sep · Netflix</b>
              <small>-S/ 39.90</small>
            </div>
            <div className="income">
              <span />
              <b>30 sep · Sueldo</b>
              <small>+S/ 3,200</small>
            </div>
            <div>
              <span />
              <b>Fin de mes</b>
              <small>{formatMoney(summary.projection.base)}</small>
            </div>
          </div>
        </Panel>
      </section>
    </>
  );
}

function SmartInbox({ data, showNotice, applyData, openRegister }: any) {
  const items = data.movements
    .filter(
      (movement: Movement) =>
        movement.status !== 'Confirmado' ||
        !movement.description ||
        (movement.type === 'Gasto' && !movement.merchant),
    )
    .map((movement: Movement) => ({
      id: movement.id,
      type: movement.status !== 'Confirmado' ? 'unusual' : 'missing',
      title:
        movement.status !== 'Confirmado'
          ? 'Pendiente de revisión'
          : 'Descripción incompleta',
      detail: `${movement.merchant || movement.description || 'Movimiento'} · ${formatMoney(movement.amount)} · ${shortDate(movement.movementDate)}`,
      reason:
        movement.status !== 'Confirmado'
          ? 'Confirma que el monto y la categoría sean correctos.'
          : 'Agrega el comercio para mejorar los análisis.',
      icon: movement.status !== 'Confirmado' ? <AlertTriangle /> : <Tags />,
    }));
  const categorized = data.movements.length
    ? Math.round(
        (data.movements.filter(
          (movement: Movement) =>
            movement.category && movement.category !== 'Otros',
        ).length /
          data.movements.length) *
          100,
      )
    : 0;
  return (
    <>
      <PageHeader
        eyebrow="Control de calidad"
        title="Bandeja de validación"
        subtitle={`${items.length} operaciones requieren una decisión`}
        action={
          <div className="header-actions">
            <Button
              variant="outline"
              onClick={() =>
                showNotice(
                  'Gmail se activará cuando conectemos la cuenta a la base segura en la nube.',
                )
              }
            >
              <Mail /> Conectar Gmail
            </Button>
            <Button variant="outline" onClick={openRegister}>
              <Upload /> Importar archivo
            </Button>
          </div>
        }
      />
      <section className="source-strip">
        <div>
          <Mail />
          <span>
            <b>Correo bancario</b>
            <small>BCP + Interbank</small>
          </span>
          <em>Preparado</em>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <b>Validación</b>
            <small>Remitente, asunto y huella única</small>
          </span>
          <em>Activa</em>
        </div>
        <div>
          <RefreshCw />
          <span>
            <b>Sin duplicados</b>
            <small>ID de Gmail + fingerprint</small>
          </span>
          <em>Automático</em>
        </div>
      </section>
      <section className="review-list">
        {!items.length && (
          <EmptyState
            icon={<Check />}
            title="No tienes movimientos pendientes de revisión"
            action="Registrar movimiento"
            onAction={openRegister}
          />
        )}
        {items.map((item: any) => (
          <article className={`review-card ${item.type}`} key={item.id}>
            <span>{item.icon}</span>
            <div>
              <small>{item.title.toUpperCase()}</small>
              <h3>{item.detail}</h3>
              <p>{item.reason}</p>
            </div>
            <div>
              <button
                onClick={() =>
                  showNotice('El movimiento se mantiene pendiente')
                }
              >
                Mantener
              </button>
              <Button
                onClick={() => {
                  applyData({
                    ...data,
                    movements: data.movements.map((movement: Movement) =>
                      movement.id === item.id
                        ? { ...movement, status: 'Confirmado', reviewed: true }
                        : movement,
                    ),
                  });
                  showNotice('Movimiento marcado como revisado');
                }}
              >
                <Check /> Revisar
              </Button>
            </div>
          </article>
        ))}
      </section>
      <Panel title="Calidad de datos" subtitle="Resumen de la base actual">
        <div className="quality-grid">
          <div>
            <b>{categorized}%</b>
            <span>movimientos categorizados</span>
          </div>
          <div>
            <b>
              {
                data.movements.filter((movement: Movement) => !movement.amount)
                  .length
              }
            </b>
            <span>montos en cero</span>
          </div>
          <div>
            <b>{data.rules.length}</b>
            <span>reglas aplicadas hoy</span>
          </div>
          <div>
            <b>
              {data.movements.filter((m: Movement) => m.attachmentCount).length}
            </b>
            <span>con comprobante</span>
          </div>
        </div>
      </Panel>
    </>
  );
}

function AssistantView({ data }: { data: FinanceData }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  function askQuestion(value: string) {
    const clean = value.trim();
    if (!clean) return;
    setThinking(true);
    window.setTimeout(() => {
      setAnswer(
        data.movements.length || data.accounts.length
          ? answerFinancialQuestion(clean, data)
          : 'Todavía no tienes datos personales. Registra un gasto, una cuenta o una boleta y podré calcular una respuesta útil.',
      );
      setThinking(false);
    }, 220);
  }
  function ask(e?: FormEvent) {
    e?.preventDefault();
    askQuestion(question);
  }
  return (
    <>
      <PageHeader
        eyebrow="Respuestas calculadas, no inventadas"
        title="Asistente financiero"
        subtitle="Pregunta en lenguaje natural y recibe respuestas calculadas al instante."
      />
      <section className="assistant-card">
        <div className="assistant-orb">
          <Sparkles />
        </div>
        <h2>¿Qué quieres entender hoy?</h2>
        <p>
          Cada monto se obtiene de tus registros y de la capa financiera
          central.
        </p>
        <div className="question-grid">
          {[
            '¿Cuánto puedo gastar hasta mi próximo ingreso?',
            '¿Cuánto debo en tarjetas?',
            '¿Cuál fue mi mayor gasto?',
            '¿Qué pagos vienen esta semana?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                askQuestion(q);
              }}
            >
              {q}
              <ArrowUpRight />
            </button>
          ))}
        </div>
        {answer && (
          <div className="assistant-answer">
            <Sparkles />
            <div>
              <small>RESPUESTA BASADA EN TUS DATOS</small>
              <p>{answer}</p>
            </div>
          </div>
        )}
        <form onSubmit={ask}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta por gastos, deuda, ahorro o pagos..."
          />
          <Button type="submit" disabled={thinking}>
            {thinking ? <RefreshCw className="spin" /> : <ArrowUpRight />}
          </Button>
        </form>
        <footer>
          <ShieldCheck /> Suma no permite que el asistente invente importes.
        </footer>
      </section>
    </>
  );
}

function SettingsView({
  data,
  openEntity,
  theme,
  onTheme,
  applyData,
  showNotice,
  user,
  onClear,
}: any) {
  const [cushion, setCushion] = useState(String(data.securityCushion));
  async function save() {
    applyData({ ...data, securityCushion: Math.max(0, Number(cushion) || 0) });
    showNotice('Preferencias guardadas');
  }
  function backup() {
    downloadBlob(
      JSON.stringify(data, null, 2),
      'suma-backup.json',
      'application/json',
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Preferencias y privacidad"
        title="Configuración"
        subtitle="Controla seguridad, automatización y presentación"
      />
      <section className="settings-grid">
        <Panel title="Preferencias generales">
          <div className="setting-row">
            <div>
              <b>Moneda principal</b>
              <small>Usada en toda la plataforma</small>
            </div>
            <select>
              <option>Sol peruano (PEN)</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <b>Formato de fecha</b>
              <small>Presentación de movimientos</small>
            </div>
            <select>
              <option>DD/MM/AAAA</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <b>Tema</b>
              <small>Claro u oscuro</small>
            </div>
            <button className="theme-control" onClick={onTheme}>
              {theme === 'dark' ? <Moon /> : <Sun />}
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>Colchón de seguridad</b>
              <small>Se resta del disponible real</small>
            </div>
            <div className="money-input">
              <span>S/</span>
              <input
                type="number"
                min="0"
                value={cushion}
                onChange={(e) => setCushion(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={save}>Guardar preferencias</Button>
        </Panel>
        <Panel title="Seguridad e integraciones">
          <div className="privacy-block">
            <ShieldCheck />
            <div>
              <b>Privacidad desde el diseño</b>
              <p>
                Gmail usa OAuth de solo lectura. El refresh token se cifra antes
                de guardarse y nunca llega al navegador.
              </p>
            </div>
          </div>
          <div className="privacy-option">
            <span>
              <b>Modo manual</b>
              <small>Archivos y registro directo disponibles</small>
            </span>
            <button>Administrar</button>
          </div>
          <div className="privacy-option">
            <span>
              <b>Motor automático de Gmail</b>
              <small>
                BCP e Interbank · requiere credenciales de producción
              </small>
            </span>
            <button
              onClick={() => {
                window.location.href = '/api/integrations/gmail/connect';
              }}
            >
              Conectar con Google
            </button>
          </div>
        </Panel>
        <Panel
          title="Reglas automáticas"
          subtitle="Sugerencias que siempre puedes revisar"
        >
          {data.rules.map((rule: any) => (
            <div className="rule-row" key={rule.id}>
              <span>
                <Sparkles />
              </span>
              <div>
                <b>Si contiene “{rule.contains}”</b>
                <small>
                  {rule.category} › {rule.subcategory}
                </small>
              </div>
              <em>Activa</em>
            </div>
          ))}
          <Button variant="outline" onClick={() => openEntity('rule')}>
            <Plus /> Nueva regla
          </Button>
        </Panel>
        <Panel title="Tus datos" subtitle="Portabilidad y respaldo">
          <div className="account-summary-row">
            <span className="top-avatar">{initials(user.name)}</span>
            <div>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </div>
            <em>Cuenta local activa</em>
          </div>
          <button className="export-row" onClick={backup}>
            <Download />
            <span>
              <b>Exportar mis datos</b>
              <small>
                Cuentas, movimientos, tarjetas, presupuestos y metas en JSON
              </small>
            </span>
            <ArrowUpRight />
          </button>
          <button
            className="export-row"
            onClick={() => exportAllCsv(data.movements)}
          >
            <FileSpreadsheet />
            <span>
              <b>Exportar movimientos</b>
              <small>Archivo CSV compatible con Excel</small>
            </span>
            <ArrowUpRight />
          </button>
          <button
            className="export-row danger-row"
            onClick={() => {
              if (
                window.confirm(
                  '¿Eliminar todas tus cuentas, gastos, tarjetas, presupuestos y metas? Esta acción no se puede deshacer.',
                )
              )
                onClear();
            }}
          >
            <Trash2 />
            <span>
              <b>Limpiar todos mis datos</b>
              <small>
                Conserva tu acceso, pero deja el espacio completamente vacío
              </small>
            </span>
            <ArrowUpRight />
          </button>
        </Panel>
      </section>
    </>
  );
}

function RegisterDialog({
  open,
  onOpenChange,
  data,
  onSaveMovement,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (x: boolean) => void;
  data: FinanceData;
  onSaveMovement: (movement: Omit<Movement, 'id'>) => Movement;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'manual' | 'smart' | 'receipt' | 'import'>(
    'manual',
  );
  const [type, setType] = useState<MovementType>('Gasto');
  const [quick, setQuick] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    merchant: '',
    category: 'Alimentación',
    subcategory: 'Supermercado',
    accountId: '',
    destinationAccountId: '',
    cardId: '',
    paymentMethod: 'Efectivo',
    installments: '1',
    scope: 'Personal',
  });
  function interpret() {
    const amount = Number(
      quick.match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.') || 0,
    );
    if (!amount) {
      setError(
        'Incluye un monto. Ejemplo: Plaza Vea 87.40 Interbank supermercado',
      );
      return;
    }
    const lower = quick.toLowerCase();
    const account = data.accounts.find(
      (a) =>
        lower.includes(a.institution.toLowerCase()) ||
        lower.includes(a.name.toLowerCase()),
    );
    const card = data.cards.find((c) => lower.includes(c.bank.toLowerCase()));
    const category = /plaza|tottus|mercado|supermercado/.test(lower)
      ? 'Alimentación'
      : /uber|taxi|primax|combustible/.test(lower)
        ? 'Transporte'
        : /sueldo|recib|pago/.test(lower)
          ? 'Ingresos'
          : 'Otros';
    const smartType = /sueldo|recib|me pagaron|ingreso/.test(lower)
      ? 'Ingreso'
      : 'Gasto';
    const merchant = quick
      .replace(/\d+(?:[.,]\d+)?/, '')
      .replace(/interbank|bbva|yape|supermercado|efectivo/gi, '')
      .trim();
    setPreview({
      type: smartType,
      amount,
      description: merchant || 'Movimiento',
      merchant,
      category,
      subcategory:
        category === 'Alimentación'
          ? 'Supermercado'
          : category === 'Transporte'
            ? 'Apps'
            : '',
      accountId: account?.id || '',
      cardId: card?.id || '',
      paymentMethod: card
        ? 'Tarjeta de crédito'
        : account?.type === 'Efectivo'
          ? 'Efectivo'
          : 'Transferencia',
      movementDate: new Date().toISOString().slice(0, 10),
      scope: 'Personal',
      source: 'Texto inteligente',
    });
    setError('');
  }
  async function save(payload: any) {
    setSaving(true);
    setError('');
    try {
      if (!Number(payload.amount) || Number(payload.amount) <= 0)
        throw new Error('Ingresa un monto mayor a cero.');
      if (!payload.description?.trim())
        throw new Error('Agrega una descripción para reconocer el movimiento.');
      onSaveMovement({
        ...payload,
        amount: Number(payload.amount),
        status: payload.status || 'Confirmado',
        scope: payload.scope || 'Personal',
        source: payload.source || 'Manual',
      });
      onOpenChange(false);
      onSaved();
      setForm({ ...form, amount: '', description: '', merchant: '' });
      setPreview(null);
      setQuick('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    save({
      type,
      amount: Number(form.amount),
      movementDate: form.date,
      description: form.description,
      merchant: form.merchant,
      category: form.category,
      subcategory: form.subcategory,
      accountId: form.accountId || null,
      destinationAccountId: form.destinationAccountId || null,
      cardId: form.cardId || null,
      paymentMethod: form.cardId ? 'Tarjeta de crédito' : form.paymentMethod,
      installments: Number(form.installments),
      scope: form.scope,
      status: 'Confirmado',
      source: 'Manual',
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="register-dialog">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Manual, por texto o desde un archivo. Nada se confirma sin tu
            revisión.
          </DialogDescription>
        </DialogHeader>
        <div className="register-modes">
          <button
            className={mode === 'manual' ? 'active' : ''}
            onClick={() => setMode('manual')}
          >
            <ReceiptText /> Manual
          </button>
          <button
            className={mode === 'smart' ? 'active' : ''}
            onClick={() => setMode('smart')}
          >
            <Sparkles /> Texto inteligente
          </button>
          <button
            className={mode === 'receipt' ? 'active' : ''}
            onClick={() => setMode('receipt')}
          >
            <Camera /> Foto de boleta
          </button>
          <button
            className={mode === 'import' ? 'active' : ''}
            onClick={() => setMode('import')}
          >
            <Upload /> Importar
          </button>
        </div>
        {mode === 'manual' && (
          <form className="register-form" onSubmit={submit}>
            <div className="type-toggle">
              {(['Gasto', 'Ingreso', 'Transferencia'] as MovementType[]).map(
                (x) => (
                  <button
                    type="button"
                    className={type === x ? 'active' : ''}
                    onClick={() => setType(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ),
              )}
            </div>
            <label className="big-amount">
              Monto
              <div>
                <span>S/</span>
                <input
                  autoFocus
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </label>
            <div className="form-grid">
              <Field label="Fecha">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Cuenta">
                <select
                  value={form.accountId}
                  onChange={(e) =>
                    setForm({ ...form, accountId: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
                  {data.accounts.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              {type === 'Transferencia' && (
                <Field label="Cuenta destino">
                  <select
                    value={form.destinationAccountId}
                    onChange={(e) =>
                      setForm({ ...form, destinationAccountId: e.target.value })
                    }
                  >
                    <option value="">Seleccionar</option>
                    {data.accounts.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Descripción">
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Ej. Compra semanal"
                />
              </Field>
              <Field label="Comercio">
                <input
                  value={form.merchant}
                  onChange={(e) =>
                    setForm({ ...form, merchant: e.target.value })
                  }
                  placeholder="Ej. Plaza Vea"
                />
              </Field>
              <Field label="Categoría">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {[
                    'Alimentación',
                    'Transporte',
                    'Vivienda',
                    'Salud',
                    'Educación',
                    'Entretenimiento',
                    'Compras',
                    'Finanzas',
                    'Ingresos',
                    'Otros',
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subcategoría">
                <input
                  value={form.subcategory}
                  onChange={(e) =>
                    setForm({ ...form, subcategory: e.target.value })
                  }
                />
              </Field>
              {type === 'Gasto' && (
                <Field label="Tarjeta (opcional)">
                  <select
                    value={form.cardId}
                    onChange={(e) =>
                      setForm({ ...form, cardId: e.target.value })
                    }
                  >
                    <option value="">No usar tarjeta</option>
                    {data.cards.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.bank} •{c.last4}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {form.cardId && (
                <Field label="Cuotas">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.installments}
                    onChange={(e) =>
                      setForm({ ...form, installments: e.target.value })
                    }
                  />
                </Field>
              )}
              <Field label="Uso">
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                >
                  <option>Personal</option>
                  <option>Hogar</option>
                  <option>Compartido</option>
                </select>
              </Field>
            </div>
            {error && (
              <p className="form-error">
                <AlertTriangle />
                {error}
              </p>
            )}
            <Button type="submit" className="full-save" disabled={saving}>
              {saving ? <RefreshCw className="spin" /> : <Check />} Guardar{' '}
              {type.toLowerCase()}
            </Button>
          </form>
        )}
        {mode === 'smart' && (
          <div className="smart-register">
            <label>
              Describe el movimiento
              <input
                autoFocus
                value={quick}
                onChange={(e) => {
                  setQuick(e.target.value);
                  setPreview(null);
                }}
                placeholder="Plaza Vea 87.40 Interbank supermercado"
              />
            </label>
            <div className="example-chips">
              <span>Prueba:</span>
              {[
                'Uber 23 Yape',
                'Recibí 500 freelance',
                'Primax 65 Interbank',
              ].map((x) => (
                <button onClick={() => setQuick(x)} key={x}>
                  {x}
                </button>
              ))}
            </div>
            <Button onClick={interpret}>
              <Sparkles /> Interpretar
            </Button>
            {preview && (
              <div className="interpretation">
                <header>
                  <span>
                    <Sparkles />
                  </span>
                  <div>
                    <small>PREVISUALIZACIÓN</small>
                    <b>
                      {preview.type} de {formatMoney(preview.amount)}
                    </b>
                  </div>
                  <em>92% confianza</em>
                </header>
                <dl>
                  <div>
                    <dt>Comercio</dt>
                    <dd>{preview.merchant}</dd>
                  </div>
                  <div>
                    <dt>Categoría</dt>
                    <dd>
                      {preview.category} › {preview.subcategory}
                    </dd>
                  </div>
                  <div>
                    <dt>Cuenta</dt>
                    <dd>
                      {data.accounts.find(
                        (a) => String(a.id) === String(preview.accountId),
                      )?.name || 'Por definir'}
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>Hoy</dd>
                  </div>
                </dl>
                <div>
                  <button onClick={() => setMode('manual')}>
                    Editar detalles
                  </button>
                  <Button onClick={() => save(preview)} disabled={saving}>
                    <Check /> Confirmar
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p className="form-error">
                <AlertTriangle />
                {error}
              </p>
            )}
          </div>
        )}
        {mode === 'receipt' && <ReceiptScanFlow data={data} onSave={save} />}
        {mode === 'import' && (
          <ImportFlow
            data={data}
            onSaveMovement={onSaveMovement}
            onDone={() => {
              onOpenChange(false);
              onSaved();
            }}
            fileRef={fileRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptScanFlow({
  data,
  onSave,
}: {
  data: FinanceData;
  onSave: (payload: Omit<Movement, 'id'>) => Promise<void>;
}) {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  async function scan(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una fotografía JPG, PNG o WebP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 12 MB.');
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(file);
    setImageUrl(URL.createObjectURL(file));
    setDraft(null);
    setError('');
    setProgress(0.02);
    setStatus('Preparando el lector…');
    try {
      const { recognize } = await import('tesseract.js');
      const result = await recognize(file, 'spa', {
        logger: (message) => {
          if (typeof message.progress === 'number')
            setProgress(message.progress);
          if (message.status) setStatus(receiptStatus(message.status));
        },
      });
      const parsed = parseReceiptText(result.data.text);
      setDraft(parsed);
      setProgress(1);
      setStatus('Lectura completada. Revisa antes de guardar.');
      if (!parsed.amount)
        setError(
          'No encontramos el total. Puedes escribirlo manualmente debajo.',
        );
    } catch {
      setError(
        'No pudimos leer esta foto. Prueba con mejor luz, la boleta completa y la cámara paralela al papel.',
      );
      setStatus('');
      setProgress(0);
    }
  }

  async function confirm() {
    if (!draft?.amount) {
      setError('Confirma un monto mayor a cero.');
      return;
    }
    await onSave({
      type: 'Gasto',
      amount: draft.amount,
      movementDate: draft.movementDate,
      description: draft.description,
      merchant: draft.merchant,
      category: draft.category,
      subcategory: draft.subcategory,
      accountId: accountId || null,
      cardId: cardId || null,
      paymentMethod: cardId
        ? 'Tarjeta'
        : accountId
          ? 'Cuenta / efectivo'
          : 'Por confirmar',
      installments: 1,
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Boleta OCR',
      tags: ['boleta', 'ocr'],
      attachmentCount: 0,
    });
  }

  return (
    <div className="receipt-flow">
      {!image && (
        <button
          className="receipt-drop"
          onClick={() => inputRef.current?.click()}
        >
          <span>
            <Camera />
          </span>
          <b>Fotografiar o elegir una boleta</b>
          <small>
            Usa buena luz, evita sombras y muestra el total completo.
          </small>
          <em>JPG, PNG o WebP · máximo 12 MB</em>
        </button>
      )}
      <input
        ref={inputRef}
        className="hidden-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(event) => scan(event.target.files?.[0])}
      />
      {image && (
        <div className="receipt-workspace">
          <div className="receipt-preview">
            <img src={imageUrl} alt="Boleta seleccionada" />
            <button onClick={() => inputRef.current?.click()}>
              <RefreshCw /> Cambiar foto
            </button>
          </div>
          <div className="receipt-result">
            {!draft ? (
              <div className="ocr-progress">
                <RefreshCw className="spin" />
                <b>{status || 'Leyendo la boleta…'}</b>
                <div className="progress">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <small>
                  {Math.round(progress * 100)}% · La primera lectura puede
                  tardar unos segundos.
                </small>
              </div>
            ) : (
              <>
                <header>
                  <span>
                    <Sparkles />
                  </span>
                  <div>
                    <small>DATOS DETECTADOS</small>
                    <b>{Math.round(draft.confidence * 100)}% de confianza</b>
                  </div>
                </header>
                <div className="receipt-fields">
                  <Field label="Comercio">
                    <input
                      value={draft.merchant}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          merchant: event.target.value,
                          description: `Compra en ${event.target.value}`,
                        })
                      }
                    />
                  </Field>
                  <Field label="Total">
                    <div className="money-input">
                      <span>S/</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={draft.amount || ''}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            amount: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Fecha">
                    <input
                      type="date"
                      value={draft.movementDate}
                      onChange={(event) =>
                        setDraft({ ...draft, movementDate: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Categoría">
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value })
                      }
                    >
                      {[
                        'Alimentación',
                        'Restaurantes',
                        'Transporte',
                        'Salud',
                        'Compras',
                        'Vivienda',
                        'Otros',
                      ].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cuenta (opcional)">
                    <select
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                    >
                      <option value="">Por confirmar</option>
                      {data.accounts.map((account) => (
                        <option value={account.id} key={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tarjeta (opcional)">
                    <select
                      value={cardId}
                      onChange={(event) => setCardId(event.target.value)}
                    >
                      <option value="">No usé tarjeta</option>
                      {data.cards.map((card) => (
                        <option value={card.id} key={card.id}>
                          {card.bank} •{card.last4}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Button className="full-save" onClick={confirm}>
                  <Check /> Guardar gasto desde boleta
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="form-error">
          <AlertTriangle />
          {error}
        </p>
      )}
      <p className="receipt-privacy">
        <ShieldCheck /> La lectura ocurre en tu navegador; la foto no se envía
        ni se conserva.
      </p>
    </div>
  );
}

function ImportFlow({ data, onDone, fileRef, onSaveMovement }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function read(selected?: File) {
    if (!selected) return;
    setFile(selected);
    setError('');
    try {
      let matrix: any[][] = [];
      if (selected.name.toLowerCase().endsWith('.csv')) {
        const text = await selected.text();
        matrix = text.split(/\r?\n/).filter(Boolean).map(splitCsv);
      } else {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await selected.arrayBuffer(), {
          type: 'array',
        });
        matrix = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
          { header: 1, raw: false },
        ) as any[][];
      }
      if (matrix.length < 2)
        throw new Error('El archivo no contiene filas para importar.');
      const sourceHeaders = matrix[0].map(String);
      setHeaders(sourceHeaders);
      const normalized = sourceHeaders.map(normalizeHeader);
      const index = (names: string[]) =>
        normalized.findIndex((h) => names.some((name) => h.includes(name)));
      const dateIndex = index(['fecha', 'date']);
      const descriptionIndex = index([
        'descripcion',
        'description',
        'concepto',
        'detalle',
        'comercio',
      ]);
      const amountIndex = index(['monto', 'importe', 'amount', 'valor']);
      const typeIndex = index(['tipo', 'type', 'naturaleza']);
      const categoryIndex = index(['categoria', 'category']);
      if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0)
        throw new Error(
          'No pudimos identificar Fecha, Descripción y Monto. Renombra esas columnas e inténtalo otra vez.',
        );
      const existing = new Set(
        data.movements.map(
          (m: Movement) =>
            `${m.movementDate}|${m.description.toLowerCase()}|${m.amount.toFixed(2)}`,
        ),
      );
      const seen = new Set<string>();
      const parsed = matrix
        .slice(1, 501)
        .filter((line) => line.some((cell) => String(cell ?? '').trim()))
        .map((line) => {
          const rawAmount = parseImportedAmount(line[amountIndex]);
          const amount = Math.abs(rawAmount);
          const movementDate = parseImportedDate(line[dateIndex]);
          const description = String(
            line[descriptionIndex] || 'Movimiento importado',
          ).trim();
          const rawType = String(
            typeIndex >= 0 ? line[typeIndex] : '',
          ).toLowerCase();
          const type: MovementType =
            rawType.includes('ingres') ||
            rawType.includes('abono') ||
            (rawAmount > 0 && rawType.includes('credit'))
              ? 'Ingreso'
              : 'Gasto';
          const key = `${movementDate}|${description.toLowerCase()}|${amount.toFixed(2)}`;
          const duplicate = existing.has(key) || seen.has(key);
          seen.add(key);
          return {
            movementDate,
            description,
            amount,
            type,
            category:
              String(categoryIndex >= 0 ? line[categoryIndex] : 'Otros') ||
              'Otros',
            paymentMethod: 'Importado',
            status: 'Confirmado',
            source: 'Importación',
            duplicate,
            valid: Boolean(movementDate && description && amount > 0),
          };
        });
      setRows(parsed);
      setStep(2);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No pudimos leer el archivo.',
      );
    }
  }
  async function confirm() {
    const candidates = rows.filter((row) => row.valid && !row.duplicate);
    if (!candidates.length) {
      setError('No hay filas nuevas y válidas para importar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const row of candidates) {
        onSaveMovement({
          type: row.type,
          amount: row.amount,
          movementDate: row.movementDate,
          description: row.description,
          merchant: '',
          category: row.category,
          paymentMethod: row.paymentMethod,
          status: row.status,
          source: 'Importación',
          scope: 'Personal',
          installments: 1,
        });
      }
      onDone();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo completar la importación.',
      );
    } finally {
      setSaving(false);
    }
  }
  const valid = rows.filter((row) => row.valid && !row.duplicate).length;
  const invalid = rows.filter((row) => !row.valid).length;
  const duplicates = rows.filter((row) => row.duplicate).length;
  return (
    <div className="import-flow">
      {step === 1 && (
        <button className="drop-zone" onClick={() => fileRef.current?.click()}>
          <Upload />
          <b>Selecciona un CSV o Excel</b>
          <small>
            Primero mostraremos una vista previa. Nada se importa
            automáticamente.
          </small>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => read(e.target.files?.[0])}
          />
        </button>
      )}
      {step === 2 && (
        <>
          <div className="import-steps">
            <span className="done">Archivo</span>
            <i />
            <span className="active">Mapeo</span>
            <i />
            <span>Validación</span>
            <i />
            <span>Confirmar</span>
          </div>
          <div className="mapping-grid">
            <label>
              Fecha <ArrowUpRight />
              <select
                value={
                  headers.find((h) => normalizeHeader(h).includes('fecha')) ||
                  ''
                }
                disabled
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label>
              Descripción <ArrowUpRight />
              <select
                value={
                  headers.find((h) =>
                    ['descripcion', 'concepto', 'detalle'].some((x) =>
                      normalizeHeader(h).includes(x),
                    ),
                  ) || ''
                }
                disabled
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label>
              Monto <ArrowUpRight />
              <select
                value={
                  headers.find((h) =>
                    ['monto', 'importe', 'valor'].some((x) =>
                      normalizeHeader(h).includes(x),
                    ),
                  ) || ''
                }
                disabled
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo <ArrowUpRight />
              <select
                value={
                  headers.find((h) => normalizeHeader(h).includes('tipo')) || ''
                }
                disabled
              >
                <option value="">Inferir</option>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="preview-table">
            <b>Vista previa · {file?.name}</b>
            {rows.slice(0, 5).map((row, i) => (
              <div key={i}>
                <span>{row.movementDate || 'Fecha inválida'}</span>
                <span>{row.description}</span>
                <span>{formatMoney(row.amount)}</span>
                <span>{row.duplicate ? 'Duplicado' : row.type}</span>
              </div>
            ))}
          </div>
          <div className="import-validation">
            <Check />
            <span>
              <b>{valid} filas listas para importar</b>
              <small>
                {invalid} inválidas · {duplicates} duplicadas se omitirán ·
                máximo 500 filas
              </small>
            </span>
          </div>
          <Button disabled={!valid} onClick={() => setStep(3)}>
            Continuar a validación <ArrowUpRight />
          </Button>
        </>
      )}
      {step === 3 && (
        <div className="import-complete">
          <ShieldCheck />
          <h3>Revisión final</h3>
          <p>
            {valid} movimientos nuevos listos. Las reglas automáticas se
            aplicarán en el servidor y podrás corregir la clasificación después.
          </p>
          <Button disabled={saving} onClick={confirm}>
            {saving ? <RefreshCw className="spin" /> : <Check />} Confirmar
            importación
          </Button>
        </div>
      )}
      {error && (
        <p className="form-error">
          <AlertTriangle />
          {error}
        </p>
      )}
    </div>
  );
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
function parseImportedAmount(value: unknown) {
  const text = String(value ?? '').replace(/[^0-9,.-]/g, '');
  if (text.includes(',') && text.includes('.'))
    return Number(
      text.lastIndexOf(',') > text.lastIndexOf('.')
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, ''),
    );
  return Number(text.replace(',', '.'));
}
function parseImportedDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match)
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function EntityDialog({
  kind,
  onOpenChange,
  onSaveEntity,
  onSaved,
}: {
  kind: EntityKind | null;
  onOpenChange: (x: boolean) => void;
  onSaveEntity: (kind: EntityKind, values: Record<string, string>) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const labels: Record<EntityKind, string> = {
    account: 'Nueva cuenta',
    card: 'Nueva tarjeta',
    budget: 'Nuevo presupuesto',
    commitment: 'Nuevo pendiente',
    goal: 'Nueva meta',
    recurring: 'Nuevo movimiento recurrente',
    rule: 'Nueva regla',
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!kind) return;
    if (!form.name?.trim() && kind !== 'rule') {
      setError('Completa el nombre.');
      return;
    }
    if (kind === 'rule' && !form.contains?.trim()) {
      setError('Escribe el texto que debe reconocer la regla.');
      return;
    }
    onSaveEntity(kind, {
      ...form,
      ...(kind === 'commitment'
        ? { commitmentKind: form.commitmentKind || 'Pagar' }
        : {}),
    });
    setForm({});
    onSaved();
  }
  if (!kind) return null;
  return (
    <Dialog open={Boolean(kind)} onOpenChange={onOpenChange}>
      <DialogContent className="entity-dialog">
        <DialogHeader>
          <DialogTitle>{labels[kind]}</DialogTitle>
          <DialogDescription>
            Los datos se integrarán con dashboard, análisis y proyección.
          </DialogDescription>
        </DialogHeader>
        <form className="entity-form" onSubmit={submit}>
          {kind === 'account' && (
            <>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Cuenta sueldo"
                />
              </Field>
              <Field label="Institución">
                <input
                  onChange={(e) =>
                    setForm({ ...form, institution: e.target.value })
                  }
                  placeholder="Interbank, Yape..."
                />
              </Field>
              <Field label="Tipo">
                <select
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>Cuenta bancaria</option>
                  <option>Ahorro</option>
                  <option>Billetera digital</option>
                  <option>Efectivo</option>
                  <option>Inversión</option>
                </select>
              </Field>
              <Field label="Saldo actual">
                <input
                  type="number"
                  step="0.01"
                  onChange={(e) =>
                    setForm({ ...form, balance: e.target.value })
                  }
                />
              </Field>
            </>
          )}
          {kind === 'card' && (
            <>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Visa Signature"
                />
              </Field>
              <Field label="Banco">
                <input
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                />
              </Field>
              <Field label="Últimos 4 dígitos">
                <input
                  maxLength={4}
                  inputMode="numeric"
                  onChange={(e) => setForm({ ...form, last4: e.target.value })}
                />
              </Field>
              <Field label="Línea total">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                />
              </Field>
              <div className="two-fields">
                <Field label="Día de cierre">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    onChange={(e) =>
                      setForm({ ...form, closingDay: e.target.value })
                    }
                  />
                </Field>
                <Field label="Día de pago">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    onChange={(e) =>
                      setForm({ ...form, dueDay: e.target.value })
                    }
                  />
                </Field>
              </div>
            </>
          )}
          {kind === 'budget' && (
            <>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Supermercado"
                />
              </Field>
              <Field label="Categoría">
                <input
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Límite mensual">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                />
              </Field>
            </>
          )}
          {kind === 'commitment' && (
            <>
              <Field label="Tipo">
                <select
                  onChange={(e) =>
                    setForm({ ...form, commitmentKind: e.target.value })
                  }
                >
                  <option>Pagar</option>
                  <option>Cobrar</option>
                  <option>Financiamiento</option>
                </select>
              </Field>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alquiler, cobro a Juan..."
                />
              </Field>
              <Field label="Monto">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Fecha límite">
                <input
                  type="date"
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Categoría">
                <input
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
            </>
          )}
          {kind === 'goal' && (
            <>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Laptop, viaje..."
                />
              </Field>
              <Field label="Meta">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                />
              </Field>
              <Field label="Ahorrado hasta hoy">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, saved: e.target.value })}
                />
              </Field>
              <Field label="Fecha objetivo">
                <input
                  type="date"
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value })
                  }
                />
              </Field>
            </>
          )}
          {kind === 'recurring' && (
            <>
              <Field label="Tipo">
                <select
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>Gasto</option>
                  <option>Ingreso</option>
                </select>
              </Field>
              <Field label="Nombre">
                <input
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Monto">
                <input
                  type="number"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Próxima fecha">
                <input
                  type="date"
                  onChange={(e) =>
                    setForm({ ...form, nextDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Categoría">
                <input
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
            </>
          )}
          {kind === 'rule' && (
            <>
              <Field label="Si la descripción contiene">
                <input
                  autoFocus
                  onChange={(e) =>
                    setForm({ ...form, contains: e.target.value })
                  }
                  placeholder="TOTTUS"
                />
              </Field>
              <Field label="Categoría">
                <input
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Alimentación"
                />
              </Field>
              <Field label="Subcategoría">
                <input
                  onChange={(e) =>
                    setForm({ ...form, subcategory: e.target.value })
                  }
                  placeholder="Supermercado"
                />
              </Field>
            </>
          )}
          {error && (
            <p className="form-error">
              <AlertTriangle />
              {error}
            </p>
          )}
          <Button type="submit" className="full-save">
            <Check /> Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function DateBadge({ date }: { date: string }) {
  const d = new Date(`${date}T12:00:00`);
  return (
    <span className="date-badge">
      <b>{d.getDate()}</b>
      <small>
        {d
          .toLocaleDateString('es-PE', { month: 'short' })
          .replace('.', '')
          .toUpperCase()}
      </small>
    </span>
  );
}
function EmptyState({
  icon,
  title,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <b>{title}</b>
      <Button variant="outline" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}
function FlowChart() {
  return (
    <div className="flow-chart">
      <div className="chart-grid">
        <i />
        <i />
        <i />
        <i />
      </div>
      <svg viewBox="0 0 720 180" preserveAspectRatio="none">
        <path
          className="income-area"
          d="M0 150 C90 142 95 115 170 120 S260 78 335 92 S450 45 520 60 S620 20 720 32 L720 180 L0 180Z"
        />
        <path
          className="income-line"
          d="M0 150 C90 142 95 115 170 120 S260 78 335 92 S450 45 520 60 S620 20 720 32"
        />
        <path
          className="expense-line"
          d="M0 165 C100 155 130 146 190 150 S300 120 360 133 S500 92 570 110 S650 82 720 90"
        />
      </svg>
      <div className="chart-labels">
        <span>1 sep</span>
        <span>8 sep</span>
        <span>15 sep</span>
        <span>22 sep</span>
        <span>30 sep</span>
      </div>
    </div>
  );
}
function MiniLineChart({
  values,
  second,
}: {
  values: number[];
  second?: number[];
}) {
  const path = (vals: number[]) => {
    const min = Math.min(...vals) * 0.9,
      max = Math.max(...vals) * 1.05,
      range = max - min || 1;
    return vals
      .map(
        (v, i) =>
          `${i ? 'L' : 'M'} ${i * (600 / (vals.length - 1))} ${150 - ((v - min) / range) * 125}`,
      )
      .join(' ');
  };
  return (
    <div className="mini-line">
      <svg viewBox="0 0 600 170" preserveAspectRatio="none">
        <path d={path(values)} className="line-primary" />
        {second && <path d={path(second)} className="line-secondary" />}
      </svg>
      <div>
        <span>Ene</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Abr</span>
        <span>May</span>
        <span>Sep</span>
      </div>
    </div>
  );
}
function MonthBars({ income, expenses }: { income: number; expenses: number }) {
  const max = Math.max(income, expenses, 1);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date
      .toLocaleDateString('es-PE', { month: 'short' })
      .replace('.', '');
  });
  return (
    <div className="month-bars">
      {months.map((month, index) => (
        <div key={`${month}-${index}`}>
          <span>
            <i
              style={{
                height: `${index === 5 ? Math.max(4, (income / max) * 100) : 0}%`,
              }}
            />
            <i
              style={{
                height: `${index === 5 ? Math.max(4, (expenses / max) * 100) : 0}%`,
              }}
            />
          </span>
          <small>{month}</small>
        </div>
      ))}
    </div>
  );
}
function ProjectionChart({ values }: { values: number[] }) {
  const min = Math.min(...values) * 0.92,
    max = Math.max(...values) * 1.04,
    range = max - min || 1;
  const coords = values.map((v, i) => [
    i * 120,
    160 - ((v - min) / range) * 130,
  ]);
  const d = coords.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
  return (
    <div className="projection-chart">
      <svg viewBox="0 0 600 180" preserveAspectRatio="none">
        <path d={`${d} L 600 180 L 0 180Z`} className="projection-fill" />
        <path d={d} className="projection-line" />
        {coords.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="5" />
        ))}
      </svg>
    </div>
  );
}
function ProgressRing({ value }: { value: number }) {
  return (
    <div
      className="progress-ring"
      style={{ '--progress': `${Math.min(100, value) * 3.6}deg` } as any}
    >
      <span>
        <b>{value}%</b>
        <small>usado</small>
      </span>
    </div>
  );
}
function CalcRow({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div>
      <span>{label}</span>
      <b className={positive ? 'positive' : ''}>
        {positive ? '+' : negative ? '-' : ''}
        {formatMoney(value)}
      </b>
    </div>
  );
}
function LoadingDashboard() {
  return (
    <div className="loading-dashboard">
      <Skeleton className="h-10 w-72" />
      <div className="loading-kpis">
        {[1, 2, 3, 4, 5].map((x) => (
          <Skeleton className="h-36" key={x} />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="loading-two">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
function shortDate(date: string) {
  return new Date(`${date}T12:00:00`)
    .toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    .replace('.', '');
}
function csvCell(value: unknown) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}
function splitCsv(line: string) {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      out.push(current.trim());
      current = '';
    } else current += char;
  }
  out.push(current.trim());
  return out;
}
function downloadBlob(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function exportAllCsv(movements: Movement[]) {
  const rows = [
    ['Fecha', 'Descripción', 'Comercio', 'Categoría', 'Tipo', 'Monto'],
    ...movements.map((m) => [
      m.movementDate,
      m.description,
      m.merchant || '',
      m.category,
      m.type,
      String(m.amount),
    ]),
  ];
  downloadBlob(
    rows.map((r) => r.map(csvCell).join(',')).join('\n'),
    'todos-mis-movimientos.csv',
    'text/csv;charset=utf-8',
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SU'
  );
}

function receiptStatus(value: string) {
  const labels: Record<string, string> = {
    'loading tesseract core': 'Preparando el lector…',
    'initializing tesseract': 'Iniciando reconocimiento…',
    'loading language traineddata': 'Cargando idioma español…',
    'initializing api': 'Analizando la imagen…',
    'recognizing text': 'Leyendo comercio, fecha y total…',
  };
  return labels[value.toLowerCase()] ?? 'Procesando la boleta…';
}
