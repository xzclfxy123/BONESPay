'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface Transaction {
  id: string
  amount: string
  asset: string
  sender: string
  recipient: string
  tx_hash: string
  timestamp: string
}

const currencies = ['LAT', 'USDT', 'USDC']

export function TransactionRecords({ isLoggedIn, account, connectWallet }: { isLoggedIn: boolean; account: string; connectWallet: () => Promise<void> }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('所有币种')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/transactions?page=${currentPage}&limit=3&search=${searchQuery}&currency=${selectedCurrency}&userAddress=${account}`)
        if (response.ok) {
          const data = await response.json()
          setTransactions(data.transactions)
          setTotalPages(data.pagination.totalPages)
        } else {
          console.error('Failed to fetch transactions')
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoggedIn && account) {
      fetchTransactions()
    }
  }, [isLoggedIn, account, currentPage, searchQuery, selectedCurrency])

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 10h.01M15 10h.01M9.5 15.5c1.333-1 3.667-1 5 0" />
          </svg>
        </div>
        <p className="text-gray-500">暂无数据</p>
        <Button variant="link" className="text-purple-600" onClick={connectWallet}>
          登录MetaMask
        </Button>
      </div>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    })
  }

  const truncateString = (str: string) => {
    if (str.length <= 13) return str
    return `${str.slice(0, 6)}...${str.slice(-4)}`
  }

  const handleTransactionClick = (txHash: string) => {
    window.open(`https://scan.platon.network/trade-detail?txHash=${txHash}`, '_blank')
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency)
    setIsDialogOpen(false)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">交易记录</h2>
      <div className="flex justify-between items-center mb-4">
        <div className="relative flex-1 mr-4">
          <Input
            type="text"
            placeholder="搜索交易..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">{selectedCurrency}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>选择币种</DialogTitle>
            </DialogHeader>
            <RadioGroup value={selectedCurrency} onValueChange={handleCurrencySelect}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="所有币种" id="all" />
                <Label htmlFor="all">所有币种</Label>
              </div>
              {currencies.map((currency) => (
                <div key={currency} className="flex items-center space-x-2">
                  <RadioGroupItem value={currency} id={currency} />
                  <Label htmlFor={currency}>
                    <div className="flex items-center space-x-2">
                      <Image src={`/${currency.toLowerCase()}.png`} alt={currency} width={20} height={20} />
                      <span>{currency}</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-4">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-gray-500">正在加载交易记录...</p>
            </div>
          </Card>
        ) : transactions.length > 0 ? (
          transactions.map((tx) => (
            <Card 
              key={tx.id} 
              className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() => handleTransactionClick(tx.tx_hash)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Image src={`/${tx.asset.toLowerCase()}.png`} alt={tx.asset} width={24} height={24} />
                    <p className="text-sm font-medium">交易</p>
                    <p className="text-sm text-gray-500">{tx.amount} {tx.asset}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatTimestamp(tx.timestamp)}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                  成功 ✓
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>发送方</span>
                  <span>{truncateString(tx.sender)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>接收方</span>
                  <span>{truncateString(tx.recipient)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>交易哈希</span>
                  <span>{truncateString(tx.tx_hash)}</span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-4">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M9 10h.01M15 10h.01M9.5 15.5c1.333-1 3.667-1 5 0" />
                </svg>
              </div>
              <p className="text-gray-500">当前没有交易记录</p>
            </div>
          </Card>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="flex justify-center items-center space-x-4 mt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            第 {currentPage} 页，共 {totalPages} 页
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

