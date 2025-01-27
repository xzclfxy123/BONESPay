"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { useWallet } from "../context/WalletContext";
import { useToast } from "@/app/hooks/use-toast"

type Reward = {
  id: string;
  name: string;
  cost: number;
  amount: number;
  category: "骰子" | "LAT" | "USDT" | "sDWH";
};

// 获取用户积分
const fetchUserScore = async (walletAddress: string) => {
  try {
    const response = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`
    );
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.points; // 返回积分
    }
    return 0;
  } catch (error) {
    console.error("获取用户积分失败:", error);
    return 0;
  }
};

// 兑换奖励的API
const exchangeReward = async (walletAddress: string, reward: Reward) => {
  try {
    const response = await fetch("https://api.deworkhub.com/api/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: walletAddress,
        type: reward.category,
        amount: reward.amount,
      }),
    });

    const data = await response.json();
    if (data.success) {
      return true;
    } else {
      alert("兑换奖励失败！");
      return false;
    }
  } catch (error) {
    console.error("兑换奖励失败:", error);
    alert("兑换奖励失败！");
    return false;
  }
};

// 更新用户剩余次数的函数
const updateRemainingTimes = async (
  walletAddress: string,
  newRemainingTimes: number
) => {
  try {
    // 先获取当前的剩余次数
    const response = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`
    );
    const data = await response.json();
    const currentRemainingTimes = data?.data?.RemainingTimes || 0;

    // 更新为现有剩余次数 + 新兑换的次数
    const updatedRemainingTimes = currentRemainingTimes + newRemainingTimes;

    // 提交更新
    const updateResponse = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletAddress,
          RemainingTimes: updatedRemainingTimes,
        }),
      }
    );
    if (!updateResponse.ok) {
      throw new Error("更新剩余次数失败");
    }
  } catch (error) {
    console.error("Error updating remaining times:", error);
  }
};

// 更新用户积分的函数
const updateUserScore = async (walletAddress: string, newScore: number) => {
  try {
    const response = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletAddress,
          points: newScore, // 更新后的积分
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("积分更新成功:", data);
    } else {
      throw new Error("更新积分失败");
    }
  } catch (error) {
    console.error("更新积分失败:", error);
  }
};

// 更新用户sDWH字段的函数
const updateUserSDFW = async (walletAddress: string, newSDFW: number) => {
  try {
    // 先获取当前的sDWH值
    const response = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`
    );
    const data = await response.json();
    const currentSDFW = data?.data?.sDWH || 0;

    const currentSDFWNumber = parseFloat(currentSDFW);
    if (isNaN(currentSDFWNumber)) {
      throw new Error("当前 sDWH 值无效，无法进行计算");
    }

    // 更新为现有的sDWH + 新兑换的sDWH
    const updatedSDFW = currentSDFWNumber + newSDFW;

    // 提交更新
    const updateResponse = await fetch(
      `https://api.deworkhub.com/api/users/${walletAddress}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletAddress,
          sDWH: updatedSDFW,
        }),
      }
    );
    if (updateResponse.ok) {
      const updatedData = await updateResponse.json();
      console.log("sDWH更新成功:", updatedData);
    } else {
      throw new Error("更新sDWH失败");
    }
  } catch (error) {
    console.error("更新sDWH失败:", error);
  }
};

export default function RewardsPage() {
  const { walletAddress } = useWallet();
  const [userScore, setUserScore] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const { toast } = useToast()

  useEffect(() => {
    if (walletAddress) {
      const getScore = async () => {
        const userScore = await fetchUserScore(walletAddress);
        setUserScore(userScore);
      };
      getScore();
    }

    setRewards([
      { id: "1", name: "骰子", cost: 10, amount: 1, category: "骰子" },
      { id: "2", name: "LAT", cost: 8, amount: 8.88, category: "LAT" },
      { id: "3", name: "LAT", cost: 10, amount: 9.99, category: "LAT" },
      { id: "4", name: "LAT", cost: 15, amount: 16.88, category: "LAT" },
      { id: "5", name: "LAT", cost: 30, amount: 26.88, category: "LAT" },
      { id: "6", name: "USDT", cost: 120, amount: 1, category: "USDT" },
      { id: "7", name: "sDWH", cost: 200, amount: 1, category: "sDWH" },
      { id: "8", name: "sDWH", cost: 898, amount: 5, category: "sDWH" },
    ]);
  }, [walletAddress]);

  const handleRedemption = async (rewardId: string) => {
    if (!walletAddress) {
      alert("请先连接钱包！");
      return;
    }

    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;

    // 检查是否有足够的积分
    if (userScore < reward.cost) {
      alert("您的积分不足，无法兑换此奖励！");
      return;
    }

    const newScore = userScore - reward.cost;

    // 对于 LAT 和 USDT 调用兑换奖励的API
    if (reward.category === "LAT" || reward.category === "USDT") {
      const exchangeSuccess = await exchangeReward(walletAddress, reward);
      if (!exchangeSuccess) return; // 兑换失败，退出

      // 更新积分
      await updateUserScore(walletAddress, newScore);
      setUserScore(newScore); // 更新本地积分

      toast({
        title: "兑换成功！",
        description: `你已成功兑换 ${reward.amount} ${reward.name}`
      })
    }

    // 对于 骰子、sDWH 等奖励，直接更新本地数据
    if (reward.category === "骰子") {
      const newRemainingTimes = reward.amount;
      await updateRemainingTimes(walletAddress, newRemainingTimes);
      await updateUserScore(walletAddress, newScore);
      setUserScore(newScore);

      toast({
        title: "兑换成功！",
        description: `你已成功兑换 ${reward.amount} ${reward.name}`
      })
    }

    if (reward.category === "sDWH") {
      const newSDFW = reward.amount;
      await updateUserSDFW(walletAddress, newSDFW);
      await updateUserScore(walletAddress, newScore);
      setUserScore(newScore);

      toast({
        title: "兑换成功！",
        description: `你已成功兑换 ${reward.amount} ${reward.name}`
      })
    }
  };

  const categoryColors: Record<Reward["category"], string> = {
    骰子: "from-blue-500 to-blue-700",
    LAT: "from-green-500 to-green-700",
    USDT: "from-purple-500 to-purple-700",
    sDWH: "from-yellow-500 to-yellow-700",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <main className="flex-1 container py-6">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">奖励中心</h1>
            <p className="text-muted-foreground">用你的积分兑换精彩奖励</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>我的积分</CardTitle>
              <CardDescription>你可以用这些积分兑换下方的奖励</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{userScore} 积分</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle
                      className={`text-transparent bg-clip-text bg-gradient-to-r ${
                        categoryColors[reward.category]
                      }`}
                    >
                      {reward.amount} {reward.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-lg font-semibold">
                      所需积分: {reward.cost}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleRedemption(reward.id)}
                      disabled={userScore < reward.cost}
                      className={`w-full bg-gradient-to-r ${
                        categoryColors[reward.category]
                      } text-white`}
                    >
                      兑换
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
