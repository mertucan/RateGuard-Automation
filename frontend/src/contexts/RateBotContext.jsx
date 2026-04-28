import { createContext, useContext, useState } from "react";

const RateBotContext = createContext(null);

export function RateBotProvider({ children }) {
  const [activeContractId, setActiveContractId] = useState(null);

  return (
    <RateBotContext.Provider value={{ activeContractId, setActiveContractId }}>
      {children}
    </RateBotContext.Provider>
  );
}

export function useRateBot() {
  return useContext(RateBotContext);
}
