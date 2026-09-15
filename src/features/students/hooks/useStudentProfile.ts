import { useEffect, useRef, useState } from 'react'
import {
  getStudentProfile,
  updateStudentProfilePhoto,
} from '@/features/students/api/studentProfileApi'
import { getStudentProfileError } from '@/features/students/api/studentProfileError'
import type {
  StudentProfile,
  StudentProfileError,
} from '@/features/students/types/studentProfile'

export function useStudentProfile() {
  const [data, setData] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<StudentProfileError | null>(null)
  const [request, setRequest] = useState(0)
  const [updatingPhoto, setUpdatingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<StudentProfileError | null>(null)
  const loadRequest = useRef<AbortController | null>(null)
  const photoRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadRequest.current = controller

    getStudentProfile(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data ?? null)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(getStudentProfileError(cause, 'profile'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [request])

  useEffect(() => () => photoRequest.current?.abort(), [])

  function retry() {
    if (photoRequest.current) return
    loadRequest.current?.abort()
    setData(null)
    setError(null)
    setPhotoError(null)
    setLoading(true)
    setRequest((value) => value + 1)
  }

  async function updatePhoto(photo: File): Promise<boolean> {
    if (photoRequest.current || loading || !data) return false
    setPhotoError(null)

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
      setPhotoError({ message: 'La foto debe tener formato JPG, PNG o WEBP.' })
      return false
    }
    if (photo.size > 2 * 1024 * 1024) {
      setPhotoError({ message: 'La foto no debe superar los 2 MB.' })
      return false
    }

    const controller = new AbortController()
    photoRequest.current = controller
    setUpdatingPhoto(true)

    try {
      const response = await updateStudentProfilePhoto(photo, controller.signal)
      if (!response.data) throw new Error('Missing profile response')
      if (controller.signal.aborted) return false
      setData(response.data)
      return true
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setPhotoError(getStudentProfileError(cause, 'photo'))
      }
      return false
    } finally {
      if (photoRequest.current === controller) photoRequest.current = null
      if (!controller.signal.aborted) setUpdatingPhoto(false)
    }
  }

  return { data, loading, error, retry, updatePhoto, updatingPhoto, photoError }
}
