import { webcrypto } from 'node:crypto'
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'
