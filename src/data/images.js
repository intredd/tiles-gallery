export const images = Array.from({ length: 27 }, (_, index) => {
  const n = String(index + 1).padStart(2, '0')

  return {
    id: n,
    src: `/images/${n}.jpg`,
    alt: `Photo ${n}`,
  }
})
