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
  { id: 'platon', name: 'PlatON Network', logo: '/lat.png', chainType: 'evm' }
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

  const handleDelegate = async (amount: string) => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask');
      return;
    }

    setIsDelegating(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 使用用户输入的金额
      const amountWei = BigInt(Web3.utils.toWei(amount, "ether"));

      // 使用 getParam 构造交易参数
      const param = getParam(1004, account, [
        0,  // type
        selectedNode.nodeId,  // nodeId
        amountWei  // 使用用户输入的金额
      ]);

      // 使用 window.ethereum.request 发送交易
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('交易结果:', result);
      toast.success('委托成功');
      setShowDelegateModal(false);
      fetchNodes();
    } catch (error) {
      console.error('委托错误:', error);
      toast.error('委托失败，请重试');
    } finally {
      setIsDelegating(false);
    }
  };

  const fetchDelegations = async (accountAddress: string) => {
    setIsLoading(true);
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

      console.log('Delegation Response:', responseData);

      if (responseData.code === 0 && responseData.totalCount > 0) {
        // 获取每个委托的 stakingBlockNum
        const delegationsWithStakingBlock = await Promise.all(
          responseData.data.map(async (delegation: any) => {
            try {
              // 获取节点信息的 API 调用
              const nodeResponse = await fetch("/api/staking/stakingDetails", {
                method: 'POST',
                headers: config.headers,
                body: JSON.stringify({
                  nodeId: delegation.nodeId,
                  stakingBlockNum: "latest" // 添加这个参数
                })
              });
              const nodeData = await nodeResponse.json();
              console.log('Node staking details:', nodeData);
              
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

        console.log('Delegations with staking block:', delegationsWithStakingBlock);
        setDelegations(delegationsWithStakingBlock);
      } else {
        console.warn('没有找到委托信息');
        toast.error('没有找到委托信息');
      }
    } catch (error) {
      console.error('Error fetching delegations:', error);
      toast.error('获取委托列表失败，请稍后重试');
    }
    setIsLoading(false);
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
    console.log('Reducing delegate with params:', { nodeId, stakingBlockNum, amount });
    if (!window.ethereum) {
      toast.error('请安装 MetaMask');
      return;
    }

    if (!stakingBlockNum) {
      console.error('Missing stakingBlockNum for node:', nodeId);
      toast.error('无法获取质押块高，请重试');
      return;
    }

    const delegation = delegations.find(d => d.nodeId === nodeId);
    if (!delegation) {
      toast.error('找不到委托信息');
      return;
    }

    // 修改可用金额计算，使用总委托金额
    const availableAmount = Number(delegation.delegateValue);
    const reduceAmount = Number(amount);

    if (reduceAmount > availableAmount) {
      toast.error(`可减持金额不足，最多可减持 ${availableAmount} LAT`);
      return;
    }

    // 计算预估解冻时间
    const currentTimestamp = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    const unlockTimestamp = currentTimestamp + (168 * 10750); // 解冻时间戳
    const estimatedUnlockDate = new Date(unlockTimestamp * 1000);

    // 如果减持的金额包含锁定部分，显示提示信息
    const lockedAmount = Number(delegation.delegateLocked);
    if (reduceAmount > (availableAmount - lockedAmount)) {
      const willBeFrozen = Math.min(reduceAmount, lockedAmount);
      toast.success(
        `减持的 ${willBeFrozen} LAT 将被冻结直到 ${estimatedUnlockDate.toLocaleDateString()} ${estimatedUnlockDate.toLocaleTimeString()}`
      );
    }

    setIsLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 将金额转换为 BigInt
      const amountInWei = BigInt(web3.utils.toWei(amount, 'ether'));

      // 获取当前区块时间戳
      const currentBlock = await web3.eth.getBlock('latest');
      const withdrawTimestamp = Number(currentBlock.timestamp);
      const unlockTimestamp = withdrawTimestamp + (168 * 10750); // 计算解冻时间
      const estimatedUnlockDate = new Date(unlockTimestamp * 1000);

      // 如果减持的金额包含锁定部分，显示提示信息
      const lockedAmount = Number(delegation.delegateLocked);
      if (reduceAmount > (availableAmount - lockedAmount)) {
        const willBeFrozen = Math.min(reduceAmount, lockedAmount);
        toast.success(
          `减持的 ${willBeFrozen} LAT 将被冻结直到 ${estimatedUnlockDate.toLocaleDateString()} ${estimatedUnlockDate.toLocaleTimeString()}`
        );
      }

      console.log('Sending transaction with params:', {
        stakingBlockNum,
        nodeId,
        amount: amountInWei.toString(),
        unlockDate: estimatedUnlockDate
      });

      // 使用 getParam 构造交易参数
      const param = getParam(1005, account, [
        BigInt(stakingBlockNum),  // 将 stakingBlockNum 转换为 BigInt
        nodeId,                   // 节点ID
        amountInWei               // 使用 BigInt 处理的金额
      ]);

      // 发送交易
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('减持委托交易结果:', result);
      toast.success('减持委托成功');
      
      // 等待一段时间后再刷新列表，确保交易已被确认
      setTimeout(() => {
        fetchDelegations(account);
      }, 5000);
    } catch (error) {
      console.error('减持委托错误:', error);
      toast.error('减持委托失败，请重试');
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
    if (!window.ethereum) {
      toast.error('请安装 MetaMask');
      return;
    }

    setIsLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 使用 getParam 构造交易参数
      const param = getParam(1006, account, []);

      // 发送交易
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('领取解锁委托交易结果:', result);
      toast.success('领取解锁委托成功');
      fetchDelegations(account); // 刷新委托列表
    } catch (error) {
      console.error('领取解锁委托错误:', error);
      toast.error('领取解锁委托失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimReward = async (nodeId: string) => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask');
      return;
    }

    setIsLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 使用 getParam 构造交易参数
      const param = getParam(5000, account, [nodeId]); // 添加节点ID参数

      // 发送交易
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('领取委托奖励交易结果:', result);
      toast.success('领取委托奖励成功');
      fetchDelegations(account); // 刷新委托列表
    } catch (error) {
      console.error('领取委托奖励错误:', error);
      toast.error('领取委托奖励失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimAllRewards = async () => {
    if (!window.ethereum) {
      toast.error('请安装 MetaMask');
      return;
    }

    setIsLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const account = accounts[0];

      // 使用 getParam 构造交易参数
      const param = getParam(5000, account, []); // ���传节点ID表示领取所有

      // 发送交易
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [param],
      });

      console.log('领取所有委托奖励交易结果:', result);
      toast.success('领取所有委托奖励成功');
      fetchDelegations(account); // 刷新委托列表
    } catch (error) {
      console.error('领取委托奖励错误:', error);
      toast.error('领取委托奖励失败，请重试');
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
                <SelectItem key={network.id} value={network.id}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={network.logo}
                      alt={network.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    {network.name}
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
              {delegations.length > 0 ? (
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
                <p>没有找到委托信息</p>
              )}
            </div>
            <Pagination
              currentPage={currentDelegationPage}
              totalPages={totalDelegationPages}
              onPageChange={setCurrentDelegationPage}
            />
          </TabsContent>

          <TabsContent value="frozen">
            {lockedDelegations && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区块</TableHead>
                      <TableHead>冻结的委托金额</TableHead>
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

