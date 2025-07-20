import { useQuery } from '@tanstack/react-query';
import { fetchLinkedInChangelog, fetchLinkedInSnapshot, fetchLinkedInProfile } from '../services/linkedin';
import { useAuthStore } from '../stores/authStore';

export const useLinkedInProfile = () => {
  const { accessToken } = useAuthStore();
  
  return useQuery({
    queryKey: ['linkedin-profile'],
    queryFn: () => fetchLinkedInProfile(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLinkedInChangelog = (startTime?: number) => {
  const { dmaToken } = useAuthStore();
  
  return useQuery({
    queryKey: ['linkedin-changelog', startTime],
    queryFn: () => fetchLinkedInChangelog(dmaToken!, startTime),
    enabled: !!dmaToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useLinkedInSnapshot = (domain?: string) => {
  const { dmaToken } = useAuthStore();
  
  return useQuery({
    queryKey: ['linkedin-snapshot', domain],
    queryFn: () => fetchLinkedInSnapshot(dmaToken!, domain),
    enabled: !!dmaToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};