#include <assert.h>	
unsigned int nondet_uint();
int main() {
unsigned int x=nondet_uint();
while(x>0) x--;
assert(x==0);
   return 0;
 }