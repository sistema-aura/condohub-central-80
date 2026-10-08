import { useEffect, useState } from "react";

export const PESSOAS_EQUIPA = ["Leonor", "Dina", "Eduardo"] as const;
const KEY = "pessoa-atual";
const EVT = "pessoa-atual-change";

/** Pessoa que está a usar o site neste computador (guardado localmente). */
export function usePessoaAtual() {
  const [pessoa, setP] = useState<string | null>(null);
  useEffect(() => {
    setP(localStorage.getItem(KEY));
    const h = () => setP(localStorage.getItem(KEY));
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  const setPessoa = (p: string) => {
    localStorage.setItem(KEY, p);
    window.dispatchEvent(new Event(EVT));
  };
  return [pessoa, setPessoa] as const;
}
