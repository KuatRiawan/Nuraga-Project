import { AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import Button from './Button';

const AlertModal = ({ isOpen, onClose, title, message, type = 'error', buttonText = 'Tutup' }) => {
    if (!isOpen) return null;

    const config = {
        error: {
            borderColor: 'border-red-500',
            bgIcon: 'bg-red-500/10',
            borderIcon: 'border-red-500/20',
            iconColor: 'text-red-500',
            buttonShadow: 'shadow-red-500/20',
            Icon: XCircle,
            buttonVariant: 'danger'
        },
        success: {
            borderColor: 'border-emerald-500',
            bgIcon: 'bg-emerald-500/10',
            borderIcon: 'border-emerald-500/20',
            iconColor: 'text-emerald-500',
            buttonShadow: 'shadow-emerald-500/20',
            Icon: CheckCircle,
            buttonVariant: 'primary' // Varian tombol utama
        },
        info: {
            borderColor: 'border-blue-500',
            bgIcon: 'bg-blue-500/10',
            borderIcon: 'border-blue-500/20',
            iconColor: 'text-blue-500',
            buttonShadow: 'shadow-blue-500/20',
            Icon: Info,
            buttonVariant: 'primary'
        },
        warning: {
            borderColor: 'border-amber-500',
            bgIcon: 'bg-amber-500/10',
            borderIcon: 'border-amber-500/20',
            iconColor: 'text-amber-500',
            buttonShadow: 'shadow-amber-500/20',
            Icon: AlertCircle,
            buttonVariant: 'primary'
        }
    };

    const current = config[type] || config.error;
    const IconComponent = current.Icon;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-slate-800 border-t-8 ${current.borderColor} w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200`}
            >
                <div className="flex justify-center mb-5">
                    <div className={`w-16 h-16 rounded-full ${current.bgIcon} flex items-center justify-center border ${current.borderIcon}`}>
                        <IconComponent size={28} className={`${current.iconColor} ml-1`} />
                    </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white text-center tracking-tighter mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium mb-6">
                    {message}
                </p>
                <div className="flex">
                    <Button type="button" variant={current.buttonVariant} onClick={onClose} className={`flex-1 rounded-2xl py-3 shadow-xl ${current.buttonShadow}`}>
                        {buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
