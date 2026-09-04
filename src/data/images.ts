export type Photo = {
    id: string,
    src: string,
    alt: string,
}

export const photos: Photo[] = Array.from({ length: 27 }, (_, index) => {
    const n = String(index + 1).padStart(2, '0')
  
    return {
      id: n,
      src: `${import.meta.env.BASE_URL}images/${n}.jpg`,
      alt: `Photo ${n}`,
    }
  })
