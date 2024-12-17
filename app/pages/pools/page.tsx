"use client"

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Header } from '@/components/ui/header'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'
import { DelegateModal } from '@/components/delegate-modal'
import { ethers } from 'ethers'
import { DelegateContractABI } from '@/app/contracts/DelegateContractABI'
import { getParam } from '@/app/utils/params'
import Web3 from 'web3'
import { convertToPlatONAddress } from '@/app/utils/platonUtils'
import { WithdrawDelegateModal } from '@/components/withdraw-delegate-modal'

const SUPPORTED_CHAINS = [
  { id: 'evm', name: 'EVM' },
  { id: 'wasm', name: 'WASM' },
  { id: 'move', name: 'MOVE' },
]

const SUPPORTED_NETWORKS = [
  { id: 'platon', name: 'PlatON Network', logo: '/lat.png', chainType: 'evm', disabled: false },
  { id: 'iris', name: 'IRIS Network', logo: '/iris.png', chainType: 'wasm', disabled: true }
]

const STATUS_MAP = {
  1: { text: '候选中', color: 'text-red-500' },
  2: { text: '活跃中', color: 'text-green-500' },
  3: { text: '出块中...', color: 'text-orange-500' },
  4: { text: '退出中', color: 'text-orange-500' },
  5: { text: '已退出', color: 'text-gray-900' },
  6: { text: '共识中', color: 'text-green-500' }
}

interface MyDelegation {
  nodeId: string;
  nodeName: string;
  delegateValue: string;
  delegateReleased: string;
  delegateLocked: string;
  delegateClaim: string;
  delegateHas: string;
  delegateUnlock: string;
  stakingBlockNum: string;
}

const formatNodeId = (nodeId: string) => {
  if (!nodeId) return '';
  const id = nodeId.startsWith('0x') ? nodeId.slice(2) : nodeId;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
};

const Pools = () => {
  const [selectedChainType, setSelectedChainType] = useState(SUPPORTED_CHAINS[0])
  const [selectedNetwork, setSelectedNetwork] = useState(SUPPORTED_NETWORKS[0])
  const [nodes, setNodes] = useState([])
  const [currentNodePage, setCurrentNodePage] = useState(1)
  const [totalNodePages, setTotalNodePages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [myDelegations, setMyDelegations] = useState<MyDelegation[]>([])
  const [currentDelegationPage, setCurrentDelegationPage] = useState(1)
  const [totalDelegationPages, setTotalDelegationPages] = useState(1)
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [delegations, setDelegations] = useState<MyDelegation[]>([]);
  const [lockedDelegations, setLockedDelegations] = useState<any>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<any>(null);
  const [account, setAccount] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState("nodes");

  const web3 = new Web3(window.ethereum);

  useEffect(() => {
    fetchNodes()
  }, [currentNodePage])

  const fetchNodes = async () => {
    setIsLoading(true);
    try {
      const url = "/api/staking/aliveStakingList";
      const config = {
        headers: {
          "Content-Type": "application/json"
        }
      };
      const data = {
        pageNo: currentNodePage,
        pageSize: 10,
        key: "",
        queryStatus: "all"
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(data)
      });
      const responseData = await response.json();
      setNodes(responseData.data || []);
      setTotalNodePages(Math.ceil((responseData.totalCount || 0) / 10));
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast.error('获取节点列表失败，请稍后重试');
    }
    setIsLoading(false);
  };

  const fetchMyDelegations = async () => {
    const mockDelegations = [
      {
        nodeId: "0x1234...",
        nodeName: "节点A",
        delegated: "1000",
        reward: "10",
        released: "500",
        locked: "500",
        delegateReward: "20"
      },
      {
        nodeId: "0x5678...",
        nodeName: "节点B", 
        delegated: "2000",
        reward: "20",
        released: "1000",
        locked: "1000",
        delegateReward: "40"
      }
    ];
    setMyDelegations(mockDelegations);
    setTotalDelegationPages(1);
  };

  useEffect(() => {
    fetchMyDelegations();
  }, [currentDelegationPage]);

  // 定义通用的 toast 样式
  const toastStyle = {
    style: {
      borderRadius: '10px',
      background: '#333',
      color: '#fff',
      padding: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    duration: 4000,
  };

  const handleDelegate = async (amount: string) => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask', { 
        icon: '🦊',
        ...toastStyle 
      });
      return;
    }

    setIsDelegating(true);
    const toastId = toast.loading('委托处理中...', { 
      icon: '⏳',
      ...toastStyle 
    });

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      const amountWei = BigInt(Web3.utils.toWei(amount, "ether"));
      const param = getParam(1004, account, [
        0,
        selectedNode.nodeId,
        amountWei
      ]);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      // 等待交易被确认
      let receipt = null;
      while (!receipt) {
        try {
          receipt = await web3.eth.getTransactionReceipt(txHash);
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          console.log('等待交易确认中...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (receipt.status) {
        toast.success(`成功委托 ${amount} LAT`, {
          id: toastId,
          icon: '🎉',
          ...toastStyle
        });
        setShowDelegateModal(false);
        
        // 刷新节点列表和委托列表
        fetchNodes();
        
        // 延迟一段时间后刷新委托列表
        setTimeout(async () => {
          try {
            const platONAddress = convertToPlatONAddress(account);
            await fetchDelegations(platONAddress);
            // 切换到我的委托标签页
            setSelectedTab("mydelegations");
          } catch (error) {
            console.error('刷新委托列表失败:', error);
          }
        }, 3000);
      } else {
        toast.error('委托失败，请重试', {
          id: toastId,
          icon: '❌',
          ...toastStyle
        });
      }
    } catch (error) {
      console.error('委托错误:', error);
      toast.error('委托失败，请重试', {
        id: toastId,
        icon: '❌',
        ...toastStyle
      });
    } finally {
      setIsDelegating(false);
    }
  };

  const fetchDelegations = async (accountAddress: string) => {
    setIsLoading(true); // 开始加载
    
    try {
      const url = "/api/staking/delegationListByAddress";
      const config = {
        headers: {
          "Content-Type": "application/json"
        }
      };
      const data = {
        pageNo: 1,
        pageSize: 20,
        address: accountAddress
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (responseData.code === 0) {
        if (responseData.totalCount > 0) {
          const delegationsWithStakingBlock = await Promise.all(
            responseData.data.map(async (delegation: any) => {
              try {
                const nodeResponse = await fetch("/api/staking/stakingDetails", {
                  method: 'POST',
                  headers: config.headers,
                  body: JSON.stringify({
                    nodeId: delegation.nodeId,
                    stakingBlockNum: "latest"
                  })
                });
                const nodeData = await nodeResponse.json();
                
                if (nodeData.code === 0 && nodeData.data) {
                  return {
                    ...delegation,
                    stakingBlockNum: nodeData.data.stakingBlockNum || nodeData.data.StakingBlockNum
                  };
                }
                return delegation;
              } catch (error) {
                console.error('Error fetching staking block:', error);
                return delegation;
              }
            })
          );

          setDelegations(delegationsWithStakingBlock);
        } else {
          setDelegations([]); // 设置空数组
        }
      } else {
        console.warn('获取委托列表失败:', responseData.errMsg);
        setDelegations([]); // 设置空数组
      }
    } catch (error) {
      console.error('Error fetching delegations:', error);
      setDelegations([]); // 设置空数组
    } finally {
      // 延迟一下加载状态的结束，让用户能看到加载动画
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  useEffect(() => {
    const fetchAccountAndDelegations = async () => {
      if (!window.ethereum) {
        toast.error('请安装 MetaMask');
        return;
      }

      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.requestAccounts();
        const currentAccount = accounts[0];
        setAccount(currentAccount);

        // 确保使用正确的地址格式
        const platONAddress = convertToPlatONAddress(currentAccount);
        fetchDelegations(platONAddress);
      } catch (error) {
        console.error('Error fetching account:', error);
        toast.error('获取账户信息失败，请稍后重试');
      }
    };

    fetchAccountAndDelegations();
  }, []);

  const handleReduceDelegate = async (nodeId: string, stakingBlockNum: string, amount: string) => {
    setIsLoading(true);
    try {
      toast.loading('减持处理中...', {
        icon: '⏳',
        ...toastStyle
      });

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      const amountInWei = BigInt(web3.utils.toWei(amount, 'ether'));
      const param = getParam(1005, account, [
        BigInt(stakingBlockNum),
        nodeId,
        amountInWei
      ]);

      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('减持委托交易结果:', result);
      toast.success(`成功减持 ${amount} LAT`, {
        icon: '📉',
        ...toastStyle
      });
      
      setTimeout(async () => {
        try {
          const platONAddress = convertToPlatONAddress(account);
          await fetchDelegations(platONAddress);
        } catch (error) {
          console.error('刷新委托列表失败:', error);
        }
      }, 5000);
    } catch (error: any) {
      handleTransactionError(error, toastId, '减持委托');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改接口定义
  interface LockDelegateInfo {
    lockDelegateList: Array<{
      blockNum: number;    // 区块号
      date: number;        // 解锁时间戳（毫秒）
      lock: string;        // 锁定金额
    }>;
    unLockBalance: string;  // 已解冻金额
    lockBalance: string;    // 未解冻金额
  }

  const fetchLockedDelegations = async () => {
    if (!window.ethereum || !account) {
      toast.error('请先连接钱包');
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const platONAddress = convertToPlatONAddress(account);

      const response = await fetch("/api/address/details", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          address: platONAddress
        })
      });

      const data = await response.json();
      
      if (data.code === 0) {
        // 处理锁定委托列表
        const locks = data.data.lockDelegateList.map(lock => ({
          ...lock,
          lock: lock.lock || '0',
          blockNum: lock.blockNum || '未知'
        }));

        setLockedDelegations({
          locks,
          released: data.data.unLockBalance || '0',  // 已解冻金额
          locked: data.data.lockBalance || '0'       // 未解冻金额
        });
      } else {
        console.warn('获取冻结委托信息失败:', data.errMsg);
        toast.error(data.errMsg || '获取冻结委托信息失败');
      }

    } catch (error) {
      console.error('查询锁定委托错误:', error);
      toast.error('查询锁定委托失败');
    }
  };

  const handleWithdrawUnlocked = async () => {
    setIsLoading(true);
    try {
      toast.loading('提取处理中...', {
        icon: '⏳',
        ...toastStyle
      });

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      const param = getParam(1006, account, []);

      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('领取解锁委托交易结果:', result);
      toast.success('成功提取解锁委托', {
        icon: '🔓',
        ...toastStyle
      });
      fetchDelegations(account);
    } catch (error) {
      console.error('提取解锁委托错误:', error);
      toast.error('提取失败，请重试', {
        icon: '❌',
        ...toastStyle
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 通用的错误处理函数
  const handleTransactionError = (error: any, toastId: string, action: string) => {
    console.error(`${action}错误:`, error);
    
    if (error.code === 4001) {
      toast.error('您取消了交易签名', {
        id: toastId,
        icon: '✋',
        ...toastStyle
      });
    } else if (error.code === -32603) {
      toast.error('交易执行失败，请检查您的余额和网络状态', {
        id: toastId,
        icon: '❌',
        ...toastStyle
      });
    } else {
      toast.error(`${action}失败，请重试`, {
        id: toastId,
        icon: '❌',
        ...toastStyle
      });
    }
  };

  const handleClaimReward = async (nodeId: string) => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask', { 
        icon: '🦊',
        ...toastStyle 
      });
      return;
    }

    setIsLoading(true);
    let toastId = toast.loading('领取奖励处理中...', {
      icon: '⏳',
      ...toastStyle
    });

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 这里需要传入 nodeId 参数来领取特定节点的奖励
      const param = getParam(5000, account, [nodeId]);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      // 等待交易被确认
      let receipt = null;
      while (!receipt) {
        try {
          receipt = await web3.eth.getTransactionReceipt(txHash);
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          console.log('等待交易确认中...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (receipt.status) {
        const delegation = delegations.find(d => d.nodeId === nodeId);
        toast.success(`成功领取节点 ${delegation?.nodeName || ''} 的委托奖励`, {
          id: toastId,
          icon: '🎉',
          ...toastStyle
        });
        
        // 延迟一段时间后刷新数据
        setTimeout(async () => {
          const platONAddress = convertToPlatONAddress(account);
          await fetchDelegations(platONAddress);
        }, 3000);
      } else {
        toast.error('领取失败，请重试', {
          id: toastId,
          icon: '❌',
          ...toastStyle
        });
      }
    } catch (error: any) {
      handleTransactionError(error, toastId, '领取奖励');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimAllRewards = async () => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask', { 
        icon: '🦊',
        ...toastStyle 
      });
      return;
    }

    setIsLoading(true);
    let toastId = toast.loading('领取所有奖励处理中...', {
      icon: '⏳',
      ...toastStyle
    });

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      const param = getParam(5000, account, []);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      // 等待交易被确认
      let receipt = null;
      while (!receipt) {
        try {
          receipt = await web3.eth.getTransactionReceipt(txHash);
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          console.log('等待交易确认中...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (receipt.status) {
        toast.success('领取所有委托奖励成功', {
          id: toastId,
          icon: '🎊',
          ...toastStyle
        });
        
        // 延迟一段时间后刷新数据
        setTimeout(async () => {
          const platONAddress = convertToPlatONAddress(account);
          await fetchDelegations(platONAddress);
        }, 3000);
      } else {
        toast.error('交易失败，请重试', {
          id: toastId,
          icon: '❌',
          ...toastStyle
        });
      }
    } catch (error: any) {
      handleTransactionError(error, toastId, '领取奖励');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改时间戳转换辅助函数
  const formatTimestamp = (timestamp: string | number) => {
    const ts = Number(timestamp);
    // 直接使用毫秒时间戳
    const date = new Date(ts);
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-l from-purple-50 to-[#FFFEFF] overflow-x-hidden">
      <Header />
      <main className="flex-grow p-4 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Staking Pools</h1>

        <div className="flex gap-4 mb-6">
          <Select value={selectedChainType.id} onValueChange={(value) => setSelectedChainType(SUPPORTED_CHAINS.find(chain => chain.id === value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择链" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CHAINS.map(chain => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedNetwork.id} onValueChange={(value) => setSelectedNetwork(SUPPORTED_NETWORKS.find(network => network.id === value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择网络" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_NETWORKS.filter(network => network.chainType === selectedChainType.id).map(network => (
                <SelectItem 
                  key={network.id} 
                  value={network.id}
                  disabled={network.disabled}
                  className={network.disabled ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <div className="flex items-center gap-2">
                    <Image
                      src={network.logo}
                      alt={network.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    {network.name}
                    {network.disabled && (
                      <span className="text-xs text-gray-400 ml-2">(即将上线)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs 
          defaultValue="nodes" 
          className="mb-6"
          value={selectedTab}
          onValueChange={setSelectedTab}
        >
          <TabsList className="flex items-center justify-between">
            <div>
              <TabsTrigger value="nodes">节点列表</TabsTrigger>
              <TabsTrigger value="mydelegations">我的委托</TabsTrigger>
              <TabsTrigger
                value="frozen"  // 添加 value 属性
                size="sm" 
                onClick={() => {
                  fetchLockedDelegations();
                  setSelectedTab("frozen");  // 切换到冻结委托标签页
                }}
                className="ml-4"
                disabled={!account}
              >
                冻结委托
              </TabsTrigger>
            </div>
            {/* 只在我的委托标签页显示一键领取按钮 */}
            {selectedTab === "mydelegations" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClaimAllRewards}
                disabled={!account || delegations.length === 0}
              >
                一键领取所有奖励
              </Button>
            )}
          </TabsList>

          <TabsContent value="nodes">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>节点</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>总质押量</TableHead>
                    <TableHead>委托人数</TableHead>
                    <TableHead>年化收益率</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map(node => (
                    <TableRow key={node.nodeId}>
                      <TableCell className="flex items-center gap-2">
                        {node.stakingIcon && (
                          <Image
                            src={node.stakingIcon}
                            alt={node.nodeName}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div>{node.nodeName}</div>
                          <div className="text-sm text-gray-500">{formatNodeId(node.nodeId)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={STATUS_MAP[node.status].color}>
                          {STATUS_MAP[node.status].text}
                        </span>
                      </TableCell>
                      <TableCell>{parseFloat(node.totalValue).toLocaleString()} LAT</TableCell>
                      <TableCell>{node.delegateQty}</TableCell>
                      <TableCell>{node.deleAnnualizedRate}%</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedNode(node);
                            setShowDelegateModal(true);
                          }}
                        >
                          委托
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={currentNodePage}
              totalPages={totalNodePages}
              onPageChange={setCurrentNodePage}
            />
          </TabsContent>

          <TabsContent value="mydelegations">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {isLoading ? (
                // 加载状态
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-gray-500">正在加载委托信息...</p>
                </div>
              ) : delegations.length > 0 ? (
                // 有委托数据时显示表格
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>节点名称</TableHead>
                      <TableHead>已委托量</TableHead>
                      <TableHead>未锁定委托</TableHead>
                      <TableHead>已锁定委托</TableHead>
                      <TableHead>待领取奖励</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map(delegation => (
                      <TableRow key={delegation.nodeId}>
                        <TableCell>
                          <div>
                            <div>{delegation.nodeName}</div>
                            <div className="text-sm text-gray-500">{formatNodeId(delegation.nodeId)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(delegation.delegateValue).toLocaleString()} LAT</TableCell>
                        <TableCell>{parseFloat(delegation.delegateHas).toLocaleString()} LAT</TableCell>
                        <TableCell>{parseFloat(delegation.delegateLocked).toLocaleString()} LAT</TableCell>
                        <TableCell>{parseFloat(delegation.delegateClaim).toLocaleString()} LAT</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log('Opening withdraw modal for delegation:', delegation);
                                setSelectedDelegation(delegation);
                                setShowWithdrawModal(true);
                              }}
                            >
                              减持委托
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleClaimReward(delegation.nodeId)}
                            >
                              领取奖励
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                // 没有委托数据时显示空状态
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-4xl mb-4">❌</div>
                  <p className="text-gray-500 mb-2">没有找到委托信息</p>
                  <p className="text-sm text-gray-400">您可以在节点列表中选择节点进行委托</p>
                </div>
              )}
            </div>
            {delegations.length > 0 && (
              <Pagination
                currentPage={currentDelegationPage}
                totalPages={totalDelegationPages}
                onPageChange={setCurrentDelegationPage}
              />
            )}
          </TabsContent>

          <TabsContent value="frozen">
            {lockedDelegations && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区块</TableHead>
                      <TableHead>冻结��委托金额</TableHead>
                      <TableHead>已解冻的委托金额</TableHead>
                      <TableHead>未解冻的委托金额</TableHead>
                      <TableHead>预计解冻时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockedDelegations.locks.map((lock, index) => (
                      <TableRow key={index}>
                        <TableCell>{lock.blockNum}</TableCell>
                        <TableCell>{Number(lock.lock).toLocaleString()} LAT</TableCell>
                        <TableCell>{Number(lockedDelegations.released).toLocaleString()} LAT</TableCell>
                        <TableCell>{Number(lockedDelegations.locked).toLocaleString()} LAT</TableCell>
                        <TableCell>
                          {new Date(lock.date).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleWithdrawUnlocked}
                            disabled={Number(lockedDelegations.released) <= 0}
                          >
                            冻结提取
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {lockedDelegations.locks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          暂无冻结委托记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        
      </main>
      <style jsx global>{`
        html, body {
          overflow-y: auto;
          scrollbar-width: none;  /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
        }
        
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 0;
          display: none;  /* Chrome, Safari, Opera */
        }
        
        * {
          scrollbar-width: none;  /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
        }
        
        *::-webkit-scrollbar {
          width: 0;
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>
      <DelegateModal
        isOpen={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        onDelegate={handleDelegate}
        nodeName={selectedNode?.nodeName || ''}
        nodeId={selectedNode?.nodeId || ''}
        isLoading={isDelegating}
      />
      <WithdrawDelegateModal
        isOpen={showWithdrawModal}
        onClose={() => {
          console.log('Closing withdraw modal');
          setShowWithdrawModal(false);
        }}
        onWithdraw={(amount) => {
          console.log('Withdrawing amount:', amount);
          handleReduceDelegate(
            selectedDelegation?.nodeId,
            selectedDelegation?.stakingBlockNum,
            amount
          );
          setShowWithdrawModal(false);
        }}
        nodeName={selectedDelegation?.nodeName || ''}
        nodeId={selectedDelegation?.nodeId || ''}
        isLoading={isLoading}
        maxAmount={selectedDelegation?.delegateValue || '0'}
        delegation={selectedDelegation}
      />
    </div>
  )
}

export default Pools

