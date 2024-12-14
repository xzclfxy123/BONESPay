import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'react-hot-toast';
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelegate: (amount: string) => void;
  nodeName: string;
  nodeId: string;
  isLoading: boolean;
}

export const DelegateModal = ({
  isOpen,
  onClose,
  onDelegate,
  nodeName,
  nodeId,
  isLoading
}: DelegateModalProps) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('请输入有效的委托金额');
      return;
    }

    try {
      onDelegate(amount);
      setAmount('');
      setError('');
    } catch (error) {
      setError('委托失败，请重试');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>委托到节点</DialogTitle>
          <DialogDescription>
            请输入要委托的 LAT 数量
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>节点名称</Label>
              <div className="text-sm text-gray-500">{nodeName}</div>
              <div className="text-xs text-gray-400">
                {nodeId.slice(0, 6)}...{nodeId.slice(-4)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">委托数量 (LAT)</Label>
              <Input
                id="amount"
                type="text"
                pattern="[0-9]*\.?[0-9]*"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                    setError('');
                  }
                }}
                disabled={isLoading}
                placeholder="请输入委托金额"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '处理中...' : '确认'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 