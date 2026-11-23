
import React, { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Scissors,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Service } from '@/types';
import {
  uploadMultipleImages,
  validateImageFile,
} from '@/utils/imageUpload';

type ServiceForm = {
  title: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  isActive: boolean;
};

type ServicePayload = {
  id?: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  images: string[];
  isActive: boolean;
};

const emptyForm = (): ServiceForm => ({
  title: '',
  description: '',
  price: '',
  duration: '',
  category: '',
  isActive: true,
});

const primaryButtonClass =
  'bg-[#963F60] text-white hover:bg-[#79324F] ' +
  'border border-[#963F60] shadow-sm ' +
  'transition-colors disabled:opacity-50';

const outlineButtonClass =
  'border border-[#E4BFCB] bg-white text-[#963F60] ' +
  'hover:border-[#963F60] hover:bg-[#FFF0F4] ' +
  'hover:text-[#79324F] transition-colors';

const inputClass =
  'border-[#EBD8DF] bg-[#FFFBFC] text-[#29252B] ' +
  'focus-visible:ring-[#EFA1B7]';

async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(options?.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  });

  let result: any;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.error ||
        `Request failed (${response.status}).`
    );
  }

  return result as T;
}

async function fetchAdminServices(): Promise<Service[]> {
  const result = await apiRequest<{
    success: boolean;
    services: Service[];
  }>('/api/admin-services');

  return result.services;
}

async function saveAdminService(
  service: ServicePayload
): Promise<Service> {
  const result = await apiRequest<{
    success: boolean;
    service: Service;
  }>('/api/admin-service-save', {
    method: 'POST',
    body: JSON.stringify(service),
  });

  return result.service;
}

async function deactivateAdminService(
  id: string
): Promise<void> {
  await apiRequest('/api/admin-service-deactivate', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

const AdminServices: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [formData, setFormData] =
    useState<ServiceForm>(emptyForm());

  const [uploadedImages, setUploadedImages] =
    useState<string[]>([]);

  const [isUploading, setIsUploading] =
    useState(false);

  const {
    data: services = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['adminNeonServices'],
    queryFn: fetchAdminServices,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: saveAdminService,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['adminNeonServices'],
      });

      toast({
        title: editingService
          ? 'Service updated successfully!'
          : 'Service created successfully!',
        description:
          'Your changes have been saved to Neon.',
      });

      setIsDialogOpen(false);
      resetForm();
    },

    onError: (error: Error) => {
      toast({
        title: 'Unable to save service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminService,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['adminNeonServices'],
      });

      toast({
        title: 'Service deactivated',
        description:
          'The service is now hidden from the public catalog. You can restore it by editing it.',
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Unable to deactivate service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isSaving = saveMutation.isPending;
  const isDeactivating = deactivateMutation.isPending;
  const isBusy = isSaving || isUploading;

  const resetForm = () => {
    setFormData(emptyForm());
    setUploadedImages([]);
    setEditingService(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);

    setFormData({
      title: service.title,
      description: service.description,
      price: String(service.price),
      duration: String(service.duration),
      category: service.category,
      isActive: service.isActive,
    });

    setUploadedImages([...service.images]);
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && isBusy) {
      return;
    }

    setIsDialogOpen(open);

    if (!open) {
      resetForm();
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files?.length || isUploading) {
      return;
    }

    const fileArray = Array.from(files);

    event.target.value = '';

    if (uploadedImages.length + fileArray.length > 20) {
      toast({
        title: 'Too many images',
        description:
          'You can save up to 20 images per service.',
        variant: 'destructive',
      });
      return;
    }

    for (const file of fileArray) {
      const validation = validateImageFile(file);

      if (!validation.valid) {
        toast({
          title: 'Invalid image',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      // The upload API accepts a maximum encoded
      // payload of approximately 4.5 MB.
      if (file.size > 3 * 1024 * 1024) {
        toast({
          title: 'Image is too large',
          description:
            'Please choose an image smaller than 3 MB.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsUploading(true);

    try {
      const urls = await uploadMultipleImages(fileArray);

      if (
        !Array.isArray(urls) ||
        urls.length !== fileArray.length ||
        urls.some(
          url => typeof url !== 'string' || !url
        )
      ) {
        throw new Error(
          'One or more images could not be uploaded.'
        );
      }

      setUploadedImages(previous => [
        ...previous,
        ...urls,
      ]);

      toast({
        title: 'Images uploaded!',
        description:
          `${urls.length} image(s) uploaded successfully.`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Image upload failed',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (isBusy) return;

    setUploadedImages(previous =>
      previous.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isBusy) return;

    const title = formData.title.trim();
    const description = formData.description.trim();
    const category = formData.category.trim();
    const price = Number(formData.price);
    const duration = Number(formData.duration);

    if (
      title.length < 2 ||
      title.length > 150 ||
      description.length > 5000 ||
      !category ||
      category.length > 100
    ) {
      toast({
        title: 'Check service information',
        description:
          'Please enter a valid title, description, and category.',
        variant: 'destructive',
      });
      return;
    }

    if (
      formData.price.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 100000 ||
      Math.abs(
        price * 100 - Math.round(price * 100)
      ) > 0.000001
    ) {
      toast({
        title: 'Invalid price',
        description:
          'Enter a valid price with no more than two decimal places.',
        variant: 'destructive',
      });
      return;
    }

    if (
      formData.duration.trim() === '' ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      toast({
        title: 'Invalid duration',
        description:
          'Enter a duration between 1 and 1440 minutes.',
        variant: 'destructive',
      });
      return;
    }

    if (
      uploadedImages.length === 0 ||
      uploadedImages.length > 20
    ) {
      toast({
        title: 'Service images required',
        description:
          'Please provide between 1 and 20 images.',
        variant: 'destructive',
      });
      return;
    }

    const payload: ServicePayload = {
      ...(editingService
        ? { id: editingService.id }
        : {}),
      title,
      description,
      price,
      duration,
      category,
      images: uploadedImages,
      isActive: formData.isActive,
    };

    saveMutation.mutate(payload);
  };

  const handleDeactivate = (service: Service) => {
    if (!service.isActive || isDeactivating) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate "${service.title}"?\n\n` +
        'It will disappear from the public service catalog, ' +
        'but its information will remain in Neon.'
    );

    if (confirmed) {
      deactivateMutation.mutate(service.id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-7">
        {/* PAGE HEADER */}

        <section className="relative overflow-hidden rounded-2xl border border-[#F0DCE3] bg-white px-6 py-8 shadow-[0_5px_24px_rgba(41,37,43,0.035)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F7DDE4]/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Scissors
                  size={16}
                  className="text-[#963F60]"
                />

                <span className="brand-eyebrow">
                  Your Nail Menu
                </span>
              </div>

              <h1 className="brand-heading text-[42px] text-[#29252B] sm:text-[52px]">
                Manage{' '}
                <span className="brand-heading-accent">
                  Services
                </span>
              </h1>
            </div>

            <Button
              type="button"
              onClick={handleAdd}
              className={`min-h-11 rounded-lg px-5 text-[12px] font-semibold ${primaryButtonClass}`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>
        </section>

        {/* LOADING STATE */}

        {isLoading && (
          <div className="brand-card flex items-center justify-center gap-3 p-10 text-sm text-[#786A72]">
            <Loader2
              className="animate-spin text-[#963F60]"
              size={22}
            />
            Loading services from Neon...
          </div>
        )}

        {/* ERROR STATE */}

        {isError && !isLoading && (
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <p className="font-semibold text-red-700">
              Unable to load services
            </p>

            <p className="mt-2 text-sm text-[#786A72]">
              {error instanceof Error
                ? error.message
                : 'Please try again.'}
            </p>

            <Button
              type="button"
              variant="outline"
              className={`mt-4 rounded-lg ${outlineButtonClass}`}
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  isFetching ? 'animate-spin' : ''
                }`}
              />
              Try Again
            </Button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!isLoading && !isError && services.length === 0 && (
          <div className="brand-card p-10 text-center">
            <Scissors
              size={32}
              className="mx-auto mb-3 text-[#EFA1B7]"
            />

            <h2 className="font-heading text-[28px] text-[#29252B]">
              No Services Yet
            </h2>

            <p className="mt-2 text-sm text-[#786A72]">
              Click Add Service to create your first service.
            </p>
          </div>
        )}

        {/* SERVICE CARDS */}

        {!isLoading && !isError && services.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map(service => (
              <Card
                key={service.id}
                className="brand-card overflow-hidden p-0 transition-shadow hover:shadow-[0_10px_30px_rgba(41,37,43,0.07)]"
              >
                {service.images?.[0] ? (
                  <img
                    src={service.images[0]}
                    alt={service.title}
                    loading="lazy"
                    className="h-48 w-full bg-[#FFF7F8] object-contain"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[#FFF7F8] text-sm text-[#96858E]">
                    No image
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-heading text-[25px] leading-tight text-[#29252B]">
                      {service.title}
                    </h3>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold ${
                        service.isActive
                          ? 'border-[#C7E4D2] bg-[#EFF9F2] text-[#397A53]'
                          : 'border-[#E5DDE1] bg-[#F6F3F4] text-[#766C71]'
                      }`}
                    >
                      {service.isActive
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-2 min-h-[40px] text-[12px] leading-5 text-[#786A72]">
                    {service.description}
                  </p>

                  <div className="mb-5 flex flex-wrap items-center gap-3 border-t border-[#F2E5E9] pt-4">
                    <span className="rounded-lg bg-[#F7DDE4]/65 px-3 py-2 text-[13px] font-bold text-[#963F60]">
                      ${Number(service.price).toFixed(2)}
                    </span>

                    <span className="text-[12px] text-[#786A72]">
                      {service.duration} min
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleEdit(service)}
                      variant="outline"
                      size="sm"
                      className={`min-h-10 flex-1 rounded-lg text-[12px] font-semibold ${outlineButtonClass}`}
                      disabled={isDeactivating}
                    >
                      <Edit
                        size={16}
                        className="mr-2"
                      />
                      Edit Service
                    </Button>

                    {service.isActive && (
                      <Button
                        type="button"
                        onClick={() =>
                          handleDeactivate(service)
                        }
                        variant="outline"
                        size="sm"
                        title="Deactivate service"
                        aria-label={`Deactivate ${service.title}`}
                        className="min-h-10 rounded-lg border border-[#F0C9D0] bg-[#FFF7F8] text-[#A5465B] hover:border-[#A5465B] hover:bg-[#FFF0F2] hover:text-[#963F60]"
                        disabled={isDeactivating}
                      >
                        {isDeactivating &&
                        deactivateMutation.variables ===
                          service.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                    )}
                  </div>

                  {!service.isActive && (
                    <p className="mt-3 text-[11px] leading-5 text-[#96858E]">
                      To restore this service, click Edit and
                      select the active checkbox.
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ADD / EDIT SERVICE DIALOG */}

        <Dialog
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#F0DCE3] bg-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-[32px] text-[#29252B]">
                {editingService
                  ? 'Edit Service'
                  : 'Add New Service'}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* TITLE */}

              <div>
                <Label
                  htmlFor="title"
                  className="text-[#29252B]"
                >
                  Service Title *
                </Label>

                <Input
                  id="title"
                  required
                  minLength={2}
                  maxLength={150}
                  disabled={isBusy}
                  value={formData.title}
                  onChange={event =>
                    setFormData(previous => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g., Gel Manicure"
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <Label
                  htmlFor="description"
                  className="text-[#29252B]"
                >
                  Description *
                </Label>

                <Textarea
                  id="description"
                  required
                  maxLength={5000}
                  disabled={isBusy}
                  value={formData.description}
                  onChange={event =>
                    setFormData(previous => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the service..."
                  rows={3}
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              {/* PRICE */}

              <div>
                <Label
                  htmlFor="price"
                  className="text-[#29252B]"
                >
                  Price ($) *
                </Label>

                <Input
                  id="price"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  required
                  disabled={isBusy}
                  value={formData.price}
                  onChange={event =>
                    setFormData(previous => ({
                      ...previous,
                      price: event.target.value,
                    }))
                  }
                  placeholder="55.00"
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              {/* DURATION AND CATEGORY */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="duration"
                    className="text-[#29252B]"
                  >
                    Duration (minutes) *
                  </Label>

                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    required
                    disabled={isBusy}
                    value={formData.duration}
                    onChange={event =>
                      setFormData(previous => ({
                        ...previous,
                        duration: event.target.value,
                      }))
                    }
                    placeholder="60"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="category"
                    className="text-[#29252B]"
                  >
                    Category *
                  </Label>

                  <Input
                    id="category"
                    required
                    maxLength={100}
                    disabled={isBusy}
                    value={formData.category}
                    onChange={event =>
                      setFormData(previous => ({
                        ...previous,
                        category: event.target.value,
                      }))
                    }
                    placeholder="e.g., Manicure"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
              </div>

              {/* IMAGE UPLOAD */}

              <div>
                <Label
                  htmlFor="imageUpload"
                  className="text-[#29252B]"
                >
                  Service Images *
                </Label>

                <div className="mt-2 space-y-4">
                  <div className="rounded-xl border-2 border-dashed border-[#E4BFCB] bg-[#FFF7F8] p-6 text-center transition-colors hover:border-[#EFA1B7]">
                    <input
                      type="file"
                      id="imageUpload"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isBusy}
                    />

                    <label
                      htmlFor="imageUpload"
                      className={
                        isBusy
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      }
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2
                            className="mb-2 animate-spin text-[#963F60]"
                            size={32}
                          />

                          <p className="text-sm text-[#786A72]">
                            Uploading images...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload
                            className="mb-2 text-[#963F60]"
                            size={32}
                          />

                          <p className="mb-1 text-sm font-semibold text-[#29252B]">
                            Click to upload images
                          </p>

                          <p className="text-xs text-[#96858E]">
                            PNG, JPG, GIF, WebP up to 3 MB each
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* UPLOADED IMAGE PREVIEWS */}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {uploadedImages.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="group relative"
                        >
                          <img
                            src={url}
                            alt={`Upload ${index + 1}`}
                            className="h-32 w-full rounded-lg bg-[#FFF7F8] object-contain"
                          />

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              removeImage(index)
                            }
                            aria-label={`Remove image ${
                              index + 1
                            }`}
                            className="absolute right-2 top-2 rounded-full border border-[#E4BFCB] bg-[#963F60] p-1 text-white transition-colors hover:bg-[#79324F] disabled:opacity-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-[#96858E]">
                  Upload multiple images for this service.
                  The first image will be the main display.
                </p>
              </div>

              {/* ACTIVE STATUS */}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  disabled={isBusy}
                  onChange={event =>
                    setFormData(previous => ({
                      ...previous,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#963F60]"
                />

                <Label
                  htmlFor="isActive"
                  className="cursor-pointer text-[#29252B]"
                >
                  Service is active and visible to customers
                </Label>
              </div>

              <p className="text-xs text-[#96858E]">
                Deposits are selected individually when
                reviewing appointment requests.
              </p>

              {/* FORM BUTTONS */}

              <div className="flex gap-3 border-t border-[#F2E5E9] pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() =>
                    handleDialogChange(false)
                  }
                  className={`min-h-11 flex-1 rounded-lg text-[12px] font-semibold ${outlineButtonClass}`}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isBusy}
                  className={`min-h-11 flex-1 rounded-lg text-[12px] font-semibold ${primaryButtonClass}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2
                        size={16}
                        className="mr-2 animate-spin"
                      />
                      Saving...
                    </>
                  ) : editingService ? (
                    'Update Service'
                  ) : (
                    'Create Service'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminServices;
