import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import { ReceiptField } from '@/components/ReceiptField';
import type { PickedFile } from '@/lib/receipt';

const mockUploadMutateAsync = jest.fn(async (_args: unknown) => ({}));
const mockRemoveMutateAsync = jest.fn(async (_id: string) => ({}));
const mockPickReceiptDocument = jest.fn<Promise<PickedFile | null>, []>();
const mockWritePdfToTempFile = jest.fn((_base64: string, _filename: string) => 'file:///tmp/recibo.pdf');

let mockReceiptData: { uri: string; base64: string; contentType: string } | undefined;

jest.mock('@/api/queries', () => ({
  useUploadReceipt: () => ({ mutateAsync: mockUploadMutateAsync, isPending: false }),
  useRemoveReceipt: () => ({ mutateAsync: mockRemoveMutateAsync, isPending: false }),
  useReceiptImage: () => ({ data: mockReceiptData, isLoading: false }),
}));

jest.mock('@/lib/receipt', () => {
  const actual = jest.requireActual('@/lib/receipt');
  return {
    ...actual,
    pickReceiptDocument: (...args: unknown[]) => mockPickReceiptDocument(...(args as [])),
    writePdfToTempFile: (...args: [string, string]) => mockWritePdfToTempFile(...args),
  };
});

describe('ReceiptField', () => {
  beforeEach(() => {
    mockUploadMutateAsync.mockClear();
    mockRemoveMutateAsync.mockClear();
    mockPickReceiptDocument.mockReset();
    mockWritePdfToTempFile.mockClear();
    mockReceiptData = undefined;
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('sin recibo todavía, ofrece elegir cómo adjuntar (incluye PDF)', async () => {
    await render(
      <ReceiptField hasReceipt={false} pendingFile={null} onPendingFileChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Adjuntar recibo'));
    expect(screen.getByText('Tomar foto')).toBeTruthy();
    expect(screen.getByText('Galería')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
  });

  it('elegir "PDF" en una transacción nueva (sin id) guarda el archivo como pendiente', async () => {
    mockPickReceiptDocument.mockResolvedValue({
      uri: 'file:///tmp/comprobante.pdf',
      name: 'comprobante.pdf',
      type: 'application/pdf',
    });
    const onPendingFileChange = jest.fn();
    await render(
      <ReceiptField hasReceipt={false} pendingFile={null} onPendingFileChange={onPendingFileChange} />,
    );
    await fireEvent.press(screen.getByText('Adjuntar recibo'));
    await fireEvent.press(screen.getByText('PDF'));

    expect(onPendingFileChange).toHaveBeenCalledWith({
      uri: 'file:///tmp/comprobante.pdf',
      name: 'comprobante.pdf',
      type: 'application/pdf',
    });
    expect(mockUploadMutateAsync).not.toHaveBeenCalled();
  });

  it('con un PDF pendiente, la vista previa es el ícono de recibo (no una imagen)', async () => {
    const pendingFile: PickedFile = {
      uri: 'file:///tmp/comprobante.pdf',
      name: 'comprobante.pdf',
      type: 'application/pdf',
    };
    await render(
      <ReceiptField hasReceipt={false} pendingFile={pendingFile} onPendingFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Abrir PDF')).toBeTruthy();
    expect(screen.queryByLabelText('Ver recibo')).toBeNull();
  });

  it('tocar el PDF en la web lo abre directo con Linking (sin escribir un archivo temporal)', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web' });
    try {
      const pendingFile: PickedFile = {
        uri: 'data:application/pdf;base64,AAAA',
        name: 'comprobante.pdf',
        type: 'application/pdf',
      };
      await render(
        <ReceiptField hasReceipt={false} pendingFile={pendingFile} onPendingFileChange={jest.fn()} />,
      );
      await fireEvent.press(screen.getByLabelText('Abrir PDF'));

      expect(Linking.openURL).toHaveBeenCalledWith('data:application/pdf;base64,AAAA');
      expect(mockWritePdfToTempFile).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { get: () => originalOS });
    }
  });

  it('un PDF ya subido (recibo existente) también muestra el ícono, no una imagen', async () => {
    mockReceiptData = {
      uri: 'data:application/pdf;base64,AAAA',
      base64: 'AAAA',
      contentType: 'application/pdf',
    };
    await render(
      <ReceiptField transactionId="t1" hasReceipt pendingFile={null} onPendingFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Abrir PDF')).toBeTruthy();
  });

  it('quitar el recibo llama a la mutación de borrado con el id de la transacción', async () => {
    mockReceiptData = {
      uri: 'data:image/jpeg;base64,AAAA',
      base64: 'AAAA',
      contentType: 'image/jpeg',
    };
    await render(
      <ReceiptField transactionId="t1" hasReceipt pendingFile={null} onPendingFileChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Quitar'));
    expect(mockRemoveMutateAsync).toHaveBeenCalledWith('t1');
  });
});
