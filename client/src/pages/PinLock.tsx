import { useState, useEffect } from "react";
import { Heart, Lock, Delete } from "lucide-react";

const CORRECT_PIN = "1221";
const SESSION_KEY = "__yh_auth__";

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      onUnlock();
    }
  }, []);

  const addDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    setError(false);
    if (next.length === 4) {
      if (next.join("") === CORRECT_PIN) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setTimeout(onUnlock, 300);
      } else {
        setShaking(true);
        setError(true);
        setTimeout(() => { setDigits([]); setShaking(false); setError(false); }, 700);
      }
    }
  };

  const removeDigit = () => { setDigits(p => p.slice(0, -1)); setError(false); };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","back"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-foreground text-lg">TINA &amp; YAYO</div>
            <div className="text-xs text-muted-foreground">Health Dashboard</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ingresa tu PIN de acceso</p>
        </div>

        <div className={`flex gap-4 ${shaking ? "animate-shake" : ""}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              digits.length > i
                ? error ? "bg-red-400 border-red-400" : "bg-primary border-primary"
                : "bg-transparent border-muted-foreground/40"
            }`} />
          ))}
        </div>

        {error && <p className="text-xs text-red-400 -mt-4">PIN incorrecto, intenta de nuevo</p>}

        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((k, i) => {
            if (k === "") return <div key={i} />;
            if (k === "back") return (
              <button key={i} onClick={removeDigit}
                className="h-16 rounded-2xl bg-secondary text-muted-foreground hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-95">
                <Delete className="w-5 h-5" />
              </button>
            );
            return (
              <button key={i} onClick={() => addDigit(k)}
                className="h-16 rounded-2xl text-lg font-semibold bg-secondary text-foreground hover:bg-secondary/70 border border-border hover:border-primary/20 transition-all active:scale-95">
                {k}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">100% privado · datos protegidos</p>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .animate-shake{animation:shake 0.5s ease-in-out}
      `}</style>
    </div>
  );
}
