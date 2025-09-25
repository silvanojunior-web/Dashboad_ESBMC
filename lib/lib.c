  #include <stdint.h> 
 _Bool mul(const int64_t a, const int64_t b, int64_t *res);
 #include "lib.h"
 _Bool mul(int64_t a, int64_t b, int64_t *res) {
   // Trivial cases
   if((a == 0) || (b == 0)) {
     *res = 0;
     return 1;
   } else if(a == 1) {
     *res = b;
     return 1;
   } else if(b == 1) {
     *res = a;
     return 1;
   }
   *res = a * b; // there exists an overflow
   return 1;
 }