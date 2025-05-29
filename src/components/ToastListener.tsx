
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const ToastListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      const { variant, title, description } = event.detail;
      toast({
        variant,
        title,
        description,
      });
    };

    window.addEventListener('show-toast', handleToastEvent as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleToastEvent as EventListener);
    };
  }, [toast]);

  return null;
};

export default ToastListener;
