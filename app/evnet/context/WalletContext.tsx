"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// 创建一个钱包地址的 Context
const WalletContext = createContext<{
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
} | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // 在组件加载时从 localStorage 恢复 walletAddress
  useEffect(() => {
    const storedWalletAddress = localStorage.getItem("walletAddress");
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
    }
  }, []);

  // 每次 walletAddress 更新时，将其同步到 localStorage
  useEffect(() => {
    if (walletAddress) {
      localStorage.setItem("walletAddress", walletAddress);
    }
  }, [walletAddress]);

  return (
    <WalletContext.Provider value={{ walletAddress, setWalletAddress }}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义 hook 来访问 Context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
