import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useApiKeys } from '@lightbridge/hooks';
import { ApiKeysListView } from '../views/api-keys-list-view';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const [offset, setOffset] = useState(0);
  const { data: allItems = [], isLoading } = useApiKeys();
  const router = useRouter();

  const slicedItems = useMemo(() => {
    return allItems.slice(offset, offset + PAGE_SIZE);
  }, [allItems, offset]);

  const hasMore = allItems.length > offset + PAGE_SIZE;
  const canPrev = offset > 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const handleNext = () => {
    if (hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  };

  const handlePrev = () => {
    if (canPrev) {
      setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
    }
  };

  return (
    <ApiKeysListView
      items={slicedItems}
      isLoading={isLoading}
      onBack={() => router.back()}
      onCreate={() => router.navigate('/api-keys/new')}
      onDelete={(id, name) => router.push(`/delete-api-key?id=${id}&name=${name}`)}
      onNext={handleNext}
      onPrev={handlePrev}
      hasMore={hasMore}
      canPrev={canPrev}
      page={page}
    />
  );
}
