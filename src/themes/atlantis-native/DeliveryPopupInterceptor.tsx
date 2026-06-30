'use client';

import { useEffect, useState } from 'react';
import FulfillmentSelector from './FulfillmentSelector';

export default function DeliveryPopupInterceptor({ storeBase: _storeBase }: { storeBase: string }) {
  const [openToken, setOpenToken] = useState(0);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href$="/collection-points"]') as HTMLAnchorElement | null;
      if (!link) return;
      event.preventDefault();
      setOpenToken((value) => value + 1);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return openToken > 0 ? <FulfillmentSelector key={openToken} compact forceOpen onClose={() => setOpenToken(0)} /> : null;
}
