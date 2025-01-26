import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RewardDialogProps {
  isOpen: boolean
  onClose: () => void
  cellNumber: number
  cellType: "normal" | "surprise"
  reward?: string
}

export function RewardDialog({ isOpen, onClose, cellNumber, cellType, reward }: RewardDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cellType === "surprise" ? "惊喜格子！" : "普通格子"}</DialogTitle>
          <DialogDescription>{cellType === "surprise" ? `恭喜获得 ${reward} 奖励！` : "谢谢惠顾！"}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

