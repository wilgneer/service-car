import React from 'react'
import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title=" " size="sm">
      <div className="flex flex-col items-center text-center gap-4 pb-2">
        <div className={`p-3 rounded-full ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <AlertTriangle size={24} className={danger ? 'text-red-600' : 'text-yellow-600'} />
        </div>
        <div>
          <p className="font-semibold text-brand-black">{title}</p>
          {message && <p className="text-sm text-brand-gray-light mt-1">{message}</p>}
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} className="flex-1" onClick={() => { onConfirm(); onClose() }}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
