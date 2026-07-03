/**
 * 同声传译 REST 客户端
 *
 * 与 docs/superpowers/specs/2026-07-02-interpreter-integration-contract.md 对应。
 * 联调期后端实现完成即可无缝替换。
 */
import axios from 'axios'

import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinAsGuestRequest,
  JoinAsGuestResponse,
  ManualTranslateRequest,
  ManualTranslateResponse,
} from '@/types/interpreter-driver'

const BASE = '/api/interpreter'

export async function createInterpreterRoom(
  req: CreateRoomRequest,
): Promise<CreateRoomResponse> {
  const { data } = await axios.post<CreateRoomResponse>(`${BASE}/rooms`, req)
  return data
}

export async function joinInterpreterRoom(
  req: JoinAsGuestRequest,
): Promise<JoinAsGuestResponse> {
  const { roomId, ...body } = req
  const { data } = await axios.post<JoinAsGuestResponse>(
    `${BASE}/rooms/${encodeURIComponent(roomId)}/join`,
    body,
  )
  return data
}

export async function translateInterpreterText(
  req: ManualTranslateRequest,
  auth?: { roomId: string; inviteToken?: string },
): Promise<ManualTranslateResponse> {
  const headers: Record<string, string> = {}
  if (auth?.roomId) headers['X-Interpreter-Room'] = auth.roomId
  if (auth?.inviteToken) headers['X-Interpreter-Token'] = auth.inviteToken
  const { data } = await axios.post<ManualTranslateResponse>(
    `${BASE}/translate`,
    req,
    { headers },
  )
  return data
}

export async function endInterpreterRoom(
  roomId: string,
): Promise<{ archiveUrl?: string; vodFileId?: string }> {
  const { data } = await axios.post<{ archiveUrl?: string; vodFileId?: string }>(
    `${BASE}/rooms/${encodeURIComponent(roomId)}/end`,
    {},
  )
  return data
}
