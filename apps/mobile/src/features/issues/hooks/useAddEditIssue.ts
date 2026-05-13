import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useUploadIssueAttachmentMutation,
  useDeleteIssueAttachmentMutation,
  useGetUnitsQuery
} from '../../../services/property';
import { Issue } from '@compound/contracts';
import { getIssueSubmitBlockReason, getAvailableIssueTargetRoles, getDefaultIssueTargetRole } from '../issue-flow-utils';

export const MAX_ATTACHMENTS = 4;

interface ExistingAttachment {
  id: string;
  url: string;
  mimeType: string | null;
  originalName: string | null;
}

export const useAddEditIssue = (issue?: Issue) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isEdit = Boolean(issue);

  const { data: units = [], isLoading: isLoadingUnits } = useGetUnitsQuery();
  const [createIssue, { isLoading: isCreating }] = useCreateIssueMutation();
  const [updateIssue, { isLoading: isUpdating }] = useUpdateIssueMutation();
  const [uploadIssueAttachment, { isLoading: isUploading }] = useUploadIssueAttachmentMutation();
  const [deleteIssueAttachment] = useDeleteIssueAttachmentMutation();

  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(() => {
    if (isEdit && issue?.attachments && issue.attachments.length > 0) {
      const attachments: ExistingAttachment[] = [];
      for (const att of issue.attachments) {
        attachments.push({
          id: att.id,
          url: att.url,
          mimeType: att.mimeType,
          originalName: att.originalName,
        });
      }

      return attachments;
    }
    return [];
  });
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<any[]>([]);

  const totalCount = existingAttachments.length + newAttachments.length;
  const canAddMore = totalCount < MAX_ATTACHMENTS;

  const addNewAttachment = (asset: any) => {
    if (!canAddMore) return;
    setNewAttachments(prev => [...prev, asset]);
  };

  const removeExistingAttachment = (id: string) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== id));
    setRemovedAttachmentIds(prev => [...prev, id]);
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const primaryUnit = units.find((unit) => unit.isPrimary) ?? units[0];
  const hasFloorScope = Boolean(primaryUnit?.unit?.floorId);
  const submitBlockReason = getIssueSubmitBlockReason({
    isLoadingUnits,
    hasPrimaryUnit: Boolean(primaryUnit?.unitId),
  });

  const availableTargetRoles = getAvailableIssueTargetRoles(hasFloorScope);

  const initialValues = useMemo(() => ({
    targetRole: issue?.metadata?.requestedTargetRole || getDefaultIssueTargetRole(hasFloorScope),
    category: issue?.category || 'maintenance',
    priority: issue?.priority || 'normal',
    title: issue?.title || '',
    description: issue?.description || '',
  }), [issue, hasFloorScope]);

  const handleSave = async (data: any) => {
    if (!isEdit && submitBlockReason) {
      if (submitBlockReason === 'loading') {
        Alert.alert(t('Common.loading'), t('Issues.loadingUnitContext'));
      } else if (submitBlockReason === 'missing-unit') {
        Alert.alert(t('Issues.assignmentRequiredTitle'), t('Issues.assignmentRequiredBody'));
      }
      return;
    }

    try {
      let savedIssue;
      if (isEdit && issue) {
        savedIssue = await updateIssue({
          id: issue.id,
          body: {
            title: data.title,
            description: data.description,
            priority: data.priority,
            category: data.category,
          } as any
        }).unwrap();
      } else {
        savedIssue = await createIssue({
          ...data,
          unitId: primaryUnit?.unitId ?? undefined,
        }).unwrap();
      }

      const issueId = savedIssue?.id ?? issue?.id!;

      if (isEdit && removedAttachmentIds.length > 0) {
        const deletePromises = [];
        for (const attachmentId of removedAttachmentIds) {
          deletePromises.push(
            deleteIssueAttachment({ issueId: issue!.id, attachmentId }).unwrap()
              .catch(err => console.error('Failed to delete attachment', attachmentId, err))
          );
        }

        await Promise.all(deletePromises);
      }

      if (newAttachments.length > 0) {
        for (const att of newAttachments) {
          const formData = new FormData() as any;
          formData.append('file', {
            uri: att.uri,
            name: att.fileName || 'attachment.jpg',
            type: att.type || att.mimeType || 'image/jpeg',
          });
          await uploadIssueAttachment({ issueId, formData }).unwrap();
        }
      }

      Alert.alert(
        t(isEdit ? 'Issues.editSuccess' : 'Issues.submitSuccess', { defaultValue: isEdit ? 'Issue updated' : 'Issue reported' }),
        t(isEdit ? 'Issues.editSuccessMsg' : 'Issues.submitSuccessMsg', { defaultValue: isEdit ? 'Your issue has been updated.' : 'Your issue has been submitted for review.' }),
        [{ text: t('Common.done'), onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      console.error('Save issue failed', err);
      Alert.alert(t('Common.error'), t('Issues.submitError'));
    }
  };

  return {
    isEdit,
    isLoading: isCreating || isUpdating || isUploading,
    submitBlockReason,
    availableTargetRoles,
    initialValues,
    handleSave,
    existingAttachments,
    newAttachments,
    addNewAttachment,
    removeExistingAttachment,
    removeNewAttachment,
    canAddMore,
    totalCount,
    hasFloorScope,
  };
};
