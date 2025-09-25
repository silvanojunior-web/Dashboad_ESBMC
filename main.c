 #include <stdint.h> 
 _Bool mul(const int64_t a, const int64_t b, int64_t *res); 
 #include "lib.h"
 // Running with esbmc  --overflow-check main.c lib.c
 int main() {
   int64_t a;
  int64_t b;
   int64_t r;
   if (mul(a, b, &r)) {
     __ESBMC_assert(r == a * b, "Expected result from multiplication");
   }
   return 0;
 }